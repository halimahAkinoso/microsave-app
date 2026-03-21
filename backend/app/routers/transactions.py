from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.models.group import Group

router = APIRouter(prefix="/transactions", tags=["transactions"])


class TransactionCreate(BaseModel):
    user_id: int
    group_id: int
    amount: float
    type: str  # deposit / withdrawal / loan
    description: Optional[str] = None


@router.get("")
def list_transactions(
    user_id: Optional[int] = None,
    group_id: Optional[int] = None,
    admin: Optional[bool] = False,   # admin=true → return ALL transactions
    db: Session = Depends(get_db)
):
    query = db.query(Transaction)
    # Only filter by user if NOT in admin mode
    if not admin and user_id:
        query = query.filter(Transaction.user_id == user_id)
    if group_id:
        query = query.filter(Transaction.group_id == group_id)
    txns = query.order_by(Transaction.created_at.desc()).all()

    result = []
    for t in txns:
        user = db.query(User).filter(User.id == t.user_id).first()
        group = db.query(Group).filter(Group.id == t.group_id).first()
        result.append({
            "id": t.id,
            "user_id": t.user_id,
            "user_name": user.name if user else "Unknown",
            "group_id": t.group_id,
            "group_name": group.name if group else "Unknown",
            "amount": t.amount,
            "type": t.type,
            "description": t.description,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })
    return result


@router.post("")
def create_transaction(data: TransactionCreate, db: Session = Depends(get_db)):
    txn = Transaction(
        user_id=data.user_id,
        group_id=data.group_id,
        amount=data.amount,
        type=data.type,
        description=data.description,
    )
    db.add(txn)
    db.commit()
    db.refresh(txn)
    return {"id": txn.id, "message": "Transaction recorded"}
