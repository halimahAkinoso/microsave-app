from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.wallet import Wallet
from app.models.user import User
from app.models.transaction import Transaction
from app.models.loan import Loan
from app.models.group_member import GroupMember
from app.models.group import Group

router = APIRouter(prefix="/wallet", tags=["wallet"])


class FundRequest(BaseModel):
    user_id: int
    amount: float
    description: str = "Wallet top-up"


class PaymentRequest(BaseModel):
    user_id: int
    amount: float
    type: str          # "contribution" or "loan_repayment"
    group_id: int
    loan_id: int = None
    description: str = ""


class SplitPaymentRequest(BaseModel):
    user_id: int
    total_amount: float
    splits: list   # [{"type": "contribution", "amount": 2000, "group_id": 1}, ...]


def get_or_create_wallet(user_id: int, db: Session) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if not wallet:
        wallet = Wallet(user_id=user_id, balance=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


@router.get("/{user_id}")
def get_wallet(user_id: int, db: Session = Depends(get_db)):
    wallet = get_or_create_wallet(user_id, db)
    user = db.query(User).filter(User.id == user_id).first()
    return {
        "user_id": user_id,
        "user_name": user.name if user else "Unknown",
        "balance": wallet.balance,
        "updated_at": wallet.updated_at.isoformat() if wallet.updated_at else None,
    }


@router.post("/fund")
def fund_wallet(data: FundRequest, db: Session = Depends(get_db)):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    wallet = get_or_create_wallet(data.user_id, db)
    wallet.balance += data.amount
    db.commit()
    # Record as a deposit transaction (no group — it's a wallet top-up)
    # We record in group_id=0 convention or skip group for wallet transactions
    return {
        "message": f"Wallet funded successfully",
        "new_balance": wallet.balance,
        "amount_added": data.amount,
    }


@router.post("/pay")
def make_payment(data: PaymentRequest, db: Session = Depends(get_db)):
    wallet = get_or_create_wallet(data.user_id, db)
    if wallet.balance < data.amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient wallet balance. Available: ₦{wallet.balance:,.0f}"
        )

    # Deduct from wallet
    wallet.balance -= data.amount

    # Record transaction
    desc = data.description or (
        "Loan repayment" if data.type == "loan_repayment" else "Group contribution"
    )
    txn = Transaction(
        user_id=data.user_id,
        group_id=data.group_id,
        amount=data.amount,
        type="deposit" if data.type == "contribution" else "loan",
        description=desc,
    )
    db.add(txn)

    # Update group balance for contributions
    if data.type == "contribution":
        group = db.query(Group).filter(Group.id == data.group_id).first()
        if group:
            group.balance += data.amount

    # Update loan repayment
    if data.type == "loan_repayment" and data.loan_id:
        loan = db.query(Loan).filter(Loan.id == data.loan_id).first()
        if loan:
            loan.amount_repaid = min(loan.amount_repaid + data.amount, loan.amount)
            if loan.amount_repaid >= loan.amount:
                loan.status = "completed"

    db.commit()
    return {
        "message": "Payment successful",
        "amount_paid": data.amount,
        "new_balance": wallet.balance,
        "type": data.type,
    }


@router.post("/split-pay")
def split_payment(data: SplitPaymentRequest, db: Session = Depends(get_db)):
    wallet = get_or_create_wallet(data.user_id, db)
    total = sum(s.get("amount", 0) for s in data.splits)
    if wallet.balance < total:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance for split. Need ₦{total:,.0f}, have ₦{wallet.balance:,.0f}"
        )

    results = []
    for split in data.splits:
        amount = split.get("amount", 0)
        group_id = split.get("group_id")
        split_type = split.get("type", "contribution")
        desc = split.get("description", f"Split payment — {split_type}")

        wallet.balance -= amount

        txn = Transaction(
            user_id=data.user_id,
            group_id=group_id,
            amount=amount,
            type="deposit" if split_type == "contribution" else "loan",
            description=desc,
        )
        db.add(txn)

        if split_type == "contribution":
            group = db.query(Group).filter(Group.id == group_id).first()
            if group:
                group.balance += amount

        if split_type == "loan_repayment" and split.get("loan_id"):
            loan = db.query(Loan).filter(Loan.id == split["loan_id"]).first()
            if loan:
                loan.amount_repaid = min(loan.amount_repaid + amount, loan.amount)
                if loan.amount_repaid >= loan.amount:
                    loan.status = "completed"

        results.append({"type": split_type, "amount": amount, "group_id": group_id})

    db.commit()
    return {
        "message": "Split payment successful",
        "total_paid": total,
        "new_balance": wallet.balance,
        "splits": results,
    }
