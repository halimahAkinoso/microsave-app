from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.transaction import Transaction
from app.models.user import User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _serialize_transaction(db: Session, transaction: Transaction) -> dict:
    user = db.query(User).filter(User.id == transaction.user_id).first()
    group = (
        db.query(Group).filter(Group.id == transaction.group_id).first()
        if transaction.group_id
        else None
    )
    return {
        "id": transaction.id,
        "user_id": transaction.user_id,
        "user_name": user.name if user else "Unknown",
        "group_id": transaction.group_id,
        "group_name": group.name if group else "Wallet",
        "amount": transaction.amount,
        "type": transaction.type,
        "description": transaction.description,
        "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
    }


@router.get("")
def list_transactions(
    group_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = (
        db.query(GroupMember)
        .filter(
            GroupMember.user_id == current_user.id,
            GroupMember.join_status == "approved",
        )
        .first()
    )

    query = db.query(Transaction)
    if membership and membership.role == "admin":
        query = query.filter(Transaction.group_id == membership.group_id)
        if group_id is not None and group_id != membership.group_id:
            raise HTTPException(status_code=403, detail="You can only view transactions for your own group.")
    else:
        query = query.filter(Transaction.user_id == current_user.id)
        if group_id is not None and (membership is None or group_id != membership.group_id):
            raise HTTPException(status_code=403, detail="You can only view transactions tied to your own group.")

    if group_id is not None:
        query = query.filter(Transaction.group_id == group_id)

    transactions = query.order_by(Transaction.created_at.desc()).all()
    return [_serialize_transaction(db, transaction) for transaction in transactions]

