from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.loan import Loan
from app.models.user import User
from app.models.group import Group
from app.models.wallet import Wallet
from app.models.transaction import Transaction

router = APIRouter(prefix="/loans", tags=["loans"])


class LoanCreate(BaseModel):
    user_id: int
    group_id: int
    amount: float
    purpose: Optional[str] = None


class StatusUpdate(BaseModel):
    status: str


class RepaymentUpdate(BaseModel):
    amount_repaid: float


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _loan_detail(loan, db):
    user = db.query(User).filter(User.id == loan.user_id).first()
    group = db.query(Group).filter(Group.id == loan.group_id).first()
    progress = round((loan.amount_repaid / loan.amount) * 100) if loan.amount > 0 else 0
    return {
        "id": loan.id,
        "user_id": loan.user_id,
        "borrower_name": user.name if user else "Unknown",
        "group_id": loan.group_id,
        "group_name": group.name if group else "Unknown",
        "amount": loan.amount,
        "amount_repaid": loan.amount_repaid,
        "repayment_progress": progress,
        "purpose": loan.purpose,
        "status": loan.status,
        "created_at": loan.created_at.isoformat() if loan.created_at else None,
    }


def _check_eligibility(loan: Loan, db: Session) -> dict:
    """
    Eligibility rules:
    1. Member must have contributed at least 50% of the requested loan amount
       (sum of all contributions by the user in that group).
    2. Member must not have any currently active loan in the group.

    Returns a dict with: eligible (bool), total_contributed, required_contribution,
    has_active_loan, rule1_pass, rule2_pass, message.
    """
    # Rule 1 — Total contributions by this user in this group
    contributions = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == loan.user_id,
            Transaction.group_id == loan.group_id,
            Transaction.type == "contribution",
        )
        .all()
    )
    total_contributed = sum(c.amount for c in contributions)
    required = loan.amount * 0.5  # 50% of requested amount
    rule1_pass = total_contributed >= required

    # Rule 2 — No active loan in this group
    active_loan = (
        db.query(Loan)
        .filter(
            Loan.user_id == loan.user_id,
            Loan.group_id == loan.group_id,
            Loan.status == "active",
            Loan.id != loan.id,  # exclude self
        )
        .first()
    )
    rule2_pass = active_loan is None
    has_active_loan = not rule2_pass

    eligible = rule1_pass and rule2_pass

    reasons = []
    if not rule1_pass:
        reasons.append(
            f"Insufficient contributions: contributed ₦{total_contributed:,.0f}, "
            f"need ₦{required:,.0f} (50% of ₦{loan.amount:,.0f})"
        )
    if not rule2_pass:
        reasons.append("Member already has an active loan in this group")

    return {
        "eligible": eligible,
        "total_contributed": total_contributed,
        "required_contribution": required,
        "has_active_loan": has_active_loan,
        "rule1_pass": rule1_pass,
        "rule2_pass": rule2_pass,
        "message": "Eligible for loan." if eligible else " | ".join(reasons),
    }


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("")
def list_loans(
    group_id: Optional[int] = None,
    user_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Loan)
    if group_id:
        query = query.filter(Loan.group_id == group_id)
    if user_id:
        query = query.filter(Loan.user_id == user_id)
    loans = query.order_by(Loan.created_at.desc()).all()
    return [_loan_detail(l, db) for l in loans]


@router.get("/{loan_id}/eligibility")
def check_loan_eligibility(loan_id: int, db: Session = Depends(get_db)):
    """Return eligibility breakdown for a pending loan request."""
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    result = _check_eligibility(loan, db)
    result["loan_id"] = loan_id
    result["loan_amount"] = loan.amount
    return result


@router.post("")
def create_loan(data: LoanCreate, db: Session = Depends(get_db)):
    loan = Loan(
        user_id=data.user_id,
        group_id=data.group_id,
        amount=data.amount,
        amount_repaid=0.0,
        purpose=data.purpose,
        status="pending",
    )
    db.add(loan)
    db.commit()
    db.refresh(loan)
    return {"id": loan.id, "message": "Loan request submitted"}


@router.patch("/{loan_id}/status")
def update_loan_status(loan_id: int, data: StatusUpdate, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    valid = ["pending", "active", "overdue", "completed"]
    if data.status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of: {valid}")
    loan.status = data.status
    db.commit()
    return {"message": "Status updated", "status": loan.status}


@router.patch("/{loan_id}/repayment")
def update_repayment(loan_id: int, data: RepaymentUpdate, db: Session = Depends(get_db)):
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    loan.amount_repaid = data.amount_repaid
    if loan.amount_repaid >= loan.amount:
        loan.status = "completed"
    db.commit()
    return {"message": "Repayment updated", "amount_repaid": loan.amount_repaid, "status": loan.status}


@router.post("/{loan_id}/approve")
def approve_loan(loan_id: int, db: Session = Depends(get_db)):
    """
    Admin approves a pending loan.
    Enforces eligibility: 50% contribution & no active loan.
    On success: status → active, amount credited to borrower's wallet.
    """
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Loan is already '{loan.status}'. Only pending loans can be approved."
        )

    # Enforce eligibility
    elig = _check_eligibility(loan, db)
    if not elig["eligible"]:
        raise HTTPException(
            status_code=400,
            detail=f"Member is not eligible: {elig['message']}"
        )

    # 1. Activate loan
    loan.status = "active"

    # 2. Credit borrower wallet
    wallet = db.query(Wallet).filter(Wallet.user_id == loan.user_id).first()
    if not wallet:
        wallet = Wallet(user_id=loan.user_id, balance=0.0)
        db.add(wallet)
        db.flush()
    wallet.balance += loan.amount

    # 3. Record disbursement transaction
    txn = Transaction(
        user_id=loan.user_id,
        group_id=loan.group_id,
        amount=loan.amount,
        type="loan",
        description=f"Loan disbursement — {loan.purpose or 'approved by admin'}",
    )
    db.add(txn)
    db.commit()

    borrower = db.query(User).filter(User.id == loan.user_id).first()
    return {
        "message": f"Loan approved. \u20a6{loan.amount:,.0f} credited to {borrower.name if borrower else 'borrower'}'s wallet.",
        "loan_id": loan_id,
        "status": "active",
        "wallet_credited": loan.amount,
        "new_wallet_balance": wallet.balance,
    }


@router.post("/{loan_id}/decline")
def decline_loan(loan_id: int, db: Session = Depends(get_db)):
    """Admin declines a pending loan."""
    loan = db.query(Loan).filter(Loan.id == loan_id).first()
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    if loan.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Loan is '{loan.status}'. Only pending loans can be declined."
        )
    loan.status = "overdue"  # frontend displays as Declined
    db.commit()
    return {"message": "Loan declined.", "loan_id": loan_id}
