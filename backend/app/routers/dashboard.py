from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.loan import Loan
from app.models.transaction import Transaction
from app.models.user import User
from app.models.wallet import Wallet
from app.services.auth_service import get_current_user, get_user_membership, serialize_membership

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _group_summary(db: Session, group: Group) -> dict:
    member_count = (
        db.query(GroupMember)
        .filter(
            GroupMember.group_id == group.id,
            GroupMember.join_status == "approved",
        )
        .count()
    )
    admin = db.query(User).filter(User.id == group.admin_id).first()
    return {
        "id": group.id,
        "name": group.name,
        "balance": group.balance,
        "member_count": member_count,
        "admin_name": admin.name if admin else "Unknown",
    }


def _serialize_transaction_row(db: Session, transaction: Transaction) -> dict:
    user = db.query(User).filter(User.id == transaction.user_id).first()
    transaction_group = (
        db.query(Group).filter(Group.id == transaction.group_id).first()
        if transaction.group_id and transaction.group_id > 0
        else None
    )
    return {
        "id": transaction.id,
        "user_name": user.name if user else "Unknown",
        "group_name": transaction_group.name if transaction_group else "Wallet",
        "amount": transaction.amount,
        "type": transaction.type,
        "description": transaction.description,
        "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
    }


def _repayment_rate(loans: list[Loan]) -> int:
    if not loans:
        return 0
    completed_loans = sum(1 for loan in loans if loan.status == "completed")
    return round((completed_loans / len(loans)) * 100)


@router.get("/stats")
def get_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = get_user_membership(db, current_user.id, ("approved", "pending"))
    membership_data = serialize_membership(db, membership)
    wallet = db.query(Wallet).filter(Wallet.user_id == current_user.id).first()
    wallet_balance = wallet.balance if wallet else 0.0

    if membership is None:
        personal_transactions = (
            db.query(Transaction)
            .filter(Transaction.user_id == current_user.id)
            .order_by(Transaction.created_at.desc())
            .limit(10)
            .all()
        )
        return {
            "scope": "unassigned",
            "membership": None,
            "wallet_balance": wallet_balance,
            "outstanding_balance": 0.0,
            "admin_queue": {"membership_requests": 0, "loan_requests": 0},
            "total_members": 0,
            "total_savings": 0,
            "active_loans": 0,
            "repayment_rate": 0,
            "recent_transactions": [_serialize_transaction_row(db, txn) for txn in personal_transactions],
            "top_groups": [],
        }

    group = db.query(Group).filter(Group.id == membership.group_id).first()
    approved_members = (
        db.query(GroupMember)
        .filter(
            GroupMember.group_id == membership.group_id,
            GroupMember.join_status == "approved",
        )
        .count()
    ) if group else 0

    group_pending_membership_requests = (
        db.query(GroupMember)
        .filter(
            GroupMember.group_id == membership.group_id,
            GroupMember.join_status == "pending",
        )
        .count()
    ) if group else 0

    group_pending_loans = (
        db.query(Loan)
        .filter(
            Loan.group_id == membership.group_id,
            Loan.status == "pending",
        )
        .count()
    ) if group else 0

    if membership.join_status == "pending":
        personal_transactions = (
            db.query(Transaction)
            .filter(Transaction.user_id == current_user.id)
            .order_by(Transaction.created_at.desc())
            .limit(10)
            .all()
        )
        return {
            "scope": "pending_membership",
            "membership": membership_data,
            "wallet_balance": wallet_balance,
            "outstanding_balance": 0.0,
            "admin_queue": {"membership_requests": 0, "loan_requests": 0},
            "total_members": approved_members,
            "total_savings": 0,
            "active_loans": 0,
            "repayment_rate": 0,
            "recent_transactions": [_serialize_transaction_row(db, txn) for txn in personal_transactions],
            "top_groups": [_group_summary(db, group)] if group else [],
        }

    if membership.role == "admin":
        loans = db.query(Loan).filter(Loan.group_id == membership.group_id).all()
        transactions = (
            db.query(Transaction)
            .filter(Transaction.group_id == membership.group_id)
            .order_by(Transaction.created_at.desc())
            .limit(10)
            .all()
        )
        active_loans = sum(1 for loan in loans if loan.status == "active")
        outstanding_balance = sum(max(loan.amount - loan.amount_repaid, 0.0) for loan in loans if loan.status in {"active", "pending", "overdue"})
        return {
            "scope": "admin_group",
            "membership": membership_data,
            "wallet_balance": wallet_balance,
            "outstanding_balance": outstanding_balance,
            "admin_queue": {
                "membership_requests": group_pending_membership_requests,
                "loan_requests": group_pending_loans,
            },
            "total_members": approved_members,
            "total_savings": group.balance if group else 0.0,
            "active_loans": active_loans,
            "repayment_rate": _repayment_rate(loans),
            "recent_transactions": [_serialize_transaction_row(db, txn) for txn in transactions],
            "top_groups": [_group_summary(db, group)] if group else [],
        }

    loans = db.query(Loan).filter(Loan.user_id == current_user.id).all()
    transactions = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.created_at.desc())
        .limit(10)
        .all()
    )
    contribution_rows = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == current_user.id,
            Transaction.group_id == membership.group_id,
        )
        .all()
    )
    total_savings = sum(
        transaction.amount
        for transaction in contribution_rows
        if transaction.type in ("contribution", "savings")
        or (
            transaction.type == "deposit"
            and any(token in (transaction.description or "").lower() for token in ("contribution", "savings"))
        )
    )
    active_loans = sum(1 for loan in loans if loan.status == "active")
    outstanding_balance = sum(max(loan.amount - loan.amount_repaid, 0.0) for loan in loans if loan.status in {"active", "pending", "overdue"})

    return {
        "scope": "member_personal",
        "membership": membership_data,
        "wallet_balance": wallet_balance,
        "outstanding_balance": outstanding_balance,
        "admin_queue": {"membership_requests": 0, "loan_requests": 0},
        "total_members": approved_members,
        "total_savings": total_savings,
        "active_loans": active_loans,
        "repayment_rate": _repayment_rate(loans),
        "recent_transactions": [_serialize_transaction_row(db, txn) for txn in transactions],
        "top_groups": [_group_summary(db, group)] if group else [],
    }
