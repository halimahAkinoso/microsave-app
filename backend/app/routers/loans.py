from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.loan import Loan
from app.models.transaction import Transaction
from app.models.user import User
from app.models.wallet import Wallet
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/loans", tags=["loans"])


class LoanCreate(BaseModel):
    group_id: int
    amount: float
    purpose: Optional[str] = None


class RepaymentUpdate(BaseModel):
    amount_repaid: float


def _approved_membership(db: Session, user_id: int, group_id: int) -> Optional[GroupMember]:
    return (
        db.query(GroupMember)
        .filter(
            GroupMember.user_id == user_id,
            GroupMember.group_id == group_id,
            GroupMember.join_status == "approved",
        )
        .first()
    )


def _require_admin_for_group(db: Session, user_id: int, group_id: int) -> None:
    membership = _approved_membership(db, user_id, group_id)
    if membership is None or membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group admin can manage this loan.",
        )


def _eligible_savings(db: Session, user_id: int, group_id: int) -> float:
    savings_rows = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.group_id == group_id,
            or_(
                Transaction.type.in_(("contribution", "savings")),
                and_(
                    Transaction.type == "deposit",
                    or_(
                        Transaction.description.ilike("%contribution%"),
                        Transaction.description.ilike("%savings%"),
                    ),
                ),
            ),
        )
        .all()
    )
    return sum(row.amount for row in savings_rows)


def _open_loan(db: Session, user_id: int, group_id: int, exclude_loan_id: Optional[int] = None) -> Optional[Loan]:
    query = (
        db.query(Loan)
        .filter(
            Loan.user_id == user_id,
            Loan.group_id == group_id,
            Loan.status.in_(("pending", "active", "overdue")),
        )
        .order_by(Loan.created_at.desc(), Loan.id.desc())
    )
    if exclude_loan_id is not None:
        query = query.filter(Loan.id != exclude_loan_id)
    return query.first()


def _check_eligibility(loan: Loan, db: Session) -> dict:
    membership = _approved_membership(db, loan.user_id, loan.group_id)
    group = db.query(Group).filter(Group.id == loan.group_id).first()
    total_saved = _eligible_savings(db, loan.user_id, loan.group_id)
    required_savings = loan.amount * 0.5
    open_loan = _open_loan(db, loan.user_id, loan.group_id, loan.id)

    is_member = membership is not None
    is_admin = bool(membership and membership.role == "admin")
    has_required_savings = total_saved >= required_savings
    has_open_loan = open_loan is not None
    group_has_funds = bool(group and group.balance >= loan.amount)

    reasons = []
    if not is_member:
        reasons.append("Borrower is not an approved member of the group.")
    if is_admin:
        reasons.append("Group admins cannot request loans from the group they manage.")
    if not has_required_savings:
        reasons.append(
            f"Insufficient savings history: saved NGN {total_saved:,.0f}, need NGN {required_savings:,.0f}."
        )
    if has_open_loan:
        reasons.append("Borrower already has an open loan or pending loan request in this group.")
    if not group_has_funds:
        reasons.append("Group balance is not enough to fund this loan.")

    return {
        "eligible": is_member and not is_admin and has_required_savings and not has_open_loan and group_has_funds,
        "group_balance": group.balance if group else 0.0,
        "total_saved": total_saved,
        "required_savings": required_savings,
        "has_open_loan": has_open_loan,
        "group_has_funds": group_has_funds,
        "is_approved_member": is_member,
        "is_admin": is_admin,
        "message": "Eligible for approval." if not reasons else " ".join(reasons),
    }


def _loan_detail(loan: Loan, db: Session, current_user: User) -> dict:
    user = db.query(User).filter(User.id == loan.user_id).first()
    group = db.query(Group).filter(Group.id == loan.group_id).first()
    progress = round((loan.amount_repaid / loan.amount) * 100) if loan.amount > 0 else 0
    can_review = bool(
        _approved_membership(db, current_user.id, loan.group_id)
        and _approved_membership(db, current_user.id, loan.group_id).role == "admin"
    )
    details = {
        "id": loan.id,
        "user_id": loan.user_id,
        "borrower_name": user.name if user else "Unknown",
        "group_id": loan.group_id,
        "group_name": group.name if group else "Unknown",
        "amount": loan.amount,
        "amount_repaid": loan.amount_repaid,
        "repayment_progress": progress,
        "remaining_balance": max(loan.amount - loan.amount_repaid, 0.0),
        "purpose": loan.purpose,
        "status": loan.status,
        "created_at": loan.created_at.isoformat() if loan.created_at else None,
        "can_admin_review": can_review and loan.status == "pending",
    }
    if loan.status == "pending":
        details["eligibility"] = _check_eligibility(loan, db)
    return details


@router.get("")
def list_loans(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_membership = (
        db.query(GroupMember)
        .filter(
            GroupMember.user_id == current_user.id,
            GroupMember.join_status == "approved",
            GroupMember.role == "admin",
        )
        .first()
    )

    query = db.query(Loan)
    if admin_membership is not None:
        query = query.filter(Loan.group_id == admin_membership.group_id)
    else:
        query = query.filter(Loan.user_id == current_user.id)

    if group_id is not None:
        if admin_membership is not None and admin_membership.group_id != group_id:
            raise HTTPException(status_code=403, detail="You can only view loans for your own group.")
        membership = _approved_membership(db, current_user.id, group_id)
        if admin_membership is None and membership is None:
            raise HTTPException(status_code=403, detail="You can only view loans for your own group.")
        query = query.filter(Loan.group_id == group_id)

    loans = query.order_by(Loan.created_at.desc()).all()
    return [_loan_detail(loan, db, current_user) for loan in loans]


@router.get("/{loan_id}/eligibility")
def check_loan_eligibility(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    membership = _approved_membership(db, current_user.id, loan.group_id)
    if membership is None:
        raise HTTPException(status_code=403, detail="You are not allowed to view this loan.")

    result = _check_eligibility(loan, db)
    result["loan_id"] = loan_id
    result["loan_amount"] = loan.amount
    return result


@router.post("")
def create_loan(
    data: LoanCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = _approved_membership(db, current_user.id, data.group_id)
    if membership is None:
        raise HTTPException(status_code=400, detail="You must be an approved member of the group to request a loan.")
    if membership.role == "admin":
        raise HTTPException(status_code=400, detail="Group admins cannot request loans from their own group.")
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Loan amount must be greater than zero.")
    existing_open_loan = _open_loan(db, current_user.id, data.group_id)
    if existing_open_loan is not None:
        raise HTTPException(
            status_code=400,
            detail="You already have an open loan or pending loan request in this group.",
        )

    loan = Loan(
        user_id=current_user.id,
        group_id=data.group_id,
        amount=data.amount,
        amount_repaid=0.0,
        purpose=data.purpose,
        status="pending",
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return {
        "message": "Loan request submitted.",
        "loan": _loan_detail(loan, db, current_user),
    }


@router.patch("/{loan_id}/repayment")
def update_repayment(
    loan_id: int,
    data: RepaymentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")

    if loan.user_id != current_user.id:
        _require_admin_for_group(db, current_user.id, loan.group_id)

    if data.amount_repaid < 0 or data.amount_repaid > loan.amount:
        raise HTTPException(status_code=400, detail="Repayment amount must be between zero and the loan amount.")

    loan.amount_repaid = data.amount_repaid
    if loan.amount_repaid >= loan.amount:
        loan.status = "completed"
    elif loan.amount_repaid > 0 and loan.status == "pending":
        loan.status = "active"
    db.commit()
    return {
        "message": "Repayment updated.",
        "loan": _loan_detail(loan, db, current_user),
    }


@router.post("/{loan_id}/approve")
def approve_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "pending":
        raise HTTPException(status_code=400, detail=f"Loan is already {loan.status}.")

    _require_admin_for_group(db, current_user.id, loan.group_id)

    eligibility = _check_eligibility(loan, db)
    if not eligibility["eligible"]:
        raise HTTPException(
            status_code=400,
            detail=f"Loan is not eligible for approval. {eligibility['message']}",
        )

    wallet = db.query(Wallet).filter(Wallet.user_id == loan.user_id).first()
    if wallet is None:
        wallet = Wallet(user_id=loan.user_id, balance=0.0)
        db.add(wallet)
        db.flush()

    group = db.query(Group).filter(Group.id == loan.group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")

    loan.status = "active"
    wallet.balance += loan.amount
    group.balance -= loan.amount

    transaction = Transaction(
        user_id=loan.user_id,
        group_id=loan.group_id,
        amount=loan.amount,
        type="loan",
        description=f"Loan disbursement for {loan.purpose or 'approved request'}",
    )
    db.add(transaction)
    db.commit()
    db.refresh(loan)

    return {
        "message": "Loan approved and disbursed to the member wallet.",
        "loan": _loan_detail(loan, db, current_user),
        "wallet_balance": wallet.balance,
    }


@router.post("/{loan_id}/decline")
def decline_loan(
    loan_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "pending":
        raise HTTPException(status_code=400, detail=f"Loan is already {loan.status}.")

    _require_admin_for_group(db, current_user.id, loan.group_id)
    loan.status = "declined"
    db.commit()
    db.refresh(loan)
    return {
        "message": "Loan declined.",
        "loan": _loan_detail(loan, db, current_user),
    }
