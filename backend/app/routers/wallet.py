import os
from datetime import datetime
from typing import Optional
from uuid import uuid4

import requests
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.loan import Loan
from app.models.paystack_payment import PaystackPayment
from app.models.transaction import Transaction
from app.models.user import User
from app.models.wallet import Wallet
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/wallet", tags=["wallet"])

PAYMENT_METHOD_LABELS = {
    "bank_transfer": "Bank Transfer",
    "card": "Card",
    "ussd": "USSD",
}
PAYSTACK_CHANNELS = {
    "bank_transfer": ["bank_transfer"],
    "card": ["card"],
    "ussd": ["ussd"],
}
PAYSTACK_BASE_URL = os.getenv("PAYSTACK_BASE_URL", "https://api.paystack.co")
PAYSTACK_TIMEOUT_SECONDS = int(os.getenv("PAYSTACK_TIMEOUT_SECONDS", "30"))


class FundRequest(BaseModel):
    amount: float
    payment_method: str = "bank_transfer"
    description: str = ""


class PaystackInitializeRequest(BaseModel):
    amount: float
    payment_method: str = "bank_transfer"
    callback_url: Optional[str] = None


class PaymentRequest(BaseModel):
    amount: float
    type: str
    group_id: int
    loan_id: Optional[int] = None
    description: str = ""


class SplitItem(BaseModel):
    type: str
    amount: float
    group_id: int
    loan_id: Optional[int] = None
    description: str = ""


class SplitPaymentRequest(BaseModel):
    splits: list[SplitItem]


def _paystack_secret_key() -> str:
    secret_key = os.getenv("PAYSTACK_SECRET_KEY", "").strip()
    if not secret_key:
        raise HTTPException(
            status_code=503,
            detail="Paystack is not configured. Set PAYSTACK_SECRET_KEY on the backend.",
        )
    return secret_key


def _paystack_headers() -> dict:
    return {
        "Authorization": f"Bearer {_paystack_secret_key()}",
        "Content-Type": "application/json",
    }


def get_or_create_wallet(user_id: int, db: Session) -> Wallet:
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    if wallet is None:
        wallet = Wallet(user_id=user_id, balance=0.0)
        db.add(wallet)
        db.commit()
        db.refresh(wallet)
    return wallet


def _get_membership(db: Session, user_id: int, group_id: int) -> Optional[GroupMember]:
    return (
        db.query(GroupMember)
        .filter(
            GroupMember.user_id == user_id,
            GroupMember.group_id == group_id,
            GroupMember.join_status == "approved",
        )
        .first()
    )


def _payment_method_label(value: str) -> str:
    return PAYMENT_METHOD_LABELS.get(value, "Selected method")


def _paystack_request(method: str, path: str, **kwargs):
    try:
        response = requests.request(
            method,
            f"{PAYSTACK_BASE_URL}{path}",
            timeout=PAYSTACK_TIMEOUT_SECONDS,
            headers=_paystack_headers(),
            **kwargs,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Unable to reach Paystack: {exc}") from exc

    try:
        payload = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=502, detail="Paystack returned an invalid response.") from exc

    if not response.ok or not payload.get("status"):
        raise HTTPException(
            status_code=502,
            detail=payload.get("message", "Paystack request failed."),
        )

    return payload["data"]


def _apply_payment(
    db: Session,
    current_user: User,
    wallet: Wallet,
    payment_type: str,
    amount: float,
    group_id: int,
    description: str,
    loan_id: Optional[int] = None,
) -> dict:
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")
    if wallet.balance < amount:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient wallet balance. Available: NGN {wallet.balance:,.0f}",
        )

    membership = _get_membership(db, current_user.id, group_id)
    if membership is None:
        raise HTTPException(status_code=403, detail="You must belong to this group to make payments.")

    group = db.query(Group).filter(Group.id == group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found")

    wallet.balance -= amount

    if payment_type in ("contribution", "savings"):
        group.balance += amount
        transaction = Transaction(
            user_id=current_user.id,
            group_id=group_id,
            amount=amount,
            type="savings",
            description=description or "Savings payment",
        )
        db.add(transaction)
        return {"type": "savings", "amount": amount, "group_id": group_id}

    if payment_type == "loan_repayment":
        if loan_id is None:
            raise HTTPException(status_code=400, detail="loan_id is required for loan repayment.")
        loan = (
            db.query(Loan)
            .filter(
                Loan.id == loan_id,
                Loan.user_id == current_user.id,
                Loan.group_id == group_id,
            )
            .first()
        )
        if loan is None:
            raise HTTPException(status_code=404, detail="Loan not found for this user and group.")
        if loan.status in ("completed", "declined"):
            raise HTTPException(status_code=400, detail=f"This loan is already {loan.status}.")

        loan.amount_repaid = min(loan.amount_repaid + amount, loan.amount)
        loan.status = "completed" if loan.amount_repaid >= loan.amount else "active"
        group.balance += amount
        transaction = Transaction(
            user_id=current_user.id,
            group_id=group_id,
            amount=amount,
            type="loan_repayment",
            description=description or "Loan repayment",
        )
        db.add(transaction)
        return {
            "type": "loan_repayment",
            "amount": amount,
            "group_id": group_id,
            "loan_id": loan_id,
        }

    raise HTTPException(status_code=400, detail="type must be savings or loan_repayment.")


def _credit_verified_payment(db: Session, payment: PaystackPayment, current_user: User) -> float:
    wallet = get_or_create_wallet(current_user.id, db)
    wallet.balance += payment.amount
    transaction = Transaction(
        user_id=current_user.id,
        group_id=0,
        amount=payment.amount,
        type="top_up",
        description=f"Wallet top-up via {_payment_method_label(payment.payment_method)} (Paystack)",
    )
    db.add(transaction)
    payment.status = "success"
    payment.verified_at = datetime.utcnow()
    db.commit()
    return wallet.balance


@router.get("/me")
def get_my_wallet(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = get_or_create_wallet(current_user.id, db)
    return {
        "user_id": current_user.id,
        "user_name": current_user.name,
        "balance": wallet.balance,
        "updated_at": wallet.updated_at.isoformat() if wallet.updated_at else None,
    }


@router.get("/{user_id}")
def get_wallet(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only view your own wallet.")
    return get_my_wallet(db, current_user)


@router.post("/fund")
def fund_wallet(
    data: FundRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")
    if data.payment_method not in PAYMENT_METHOD_LABELS:
        raise HTTPException(
            status_code=400,
            detail="payment_method must be one of: bank_transfer, card, ussd.",
        )

    wallet = get_or_create_wallet(current_user.id, db)
    wallet.balance += data.amount
    payment_label = _payment_method_label(data.payment_method)
    transaction = Transaction(
        user_id=current_user.id,
        group_id=0,
        amount=data.amount,
        type="top_up",
        description=data.description or f"Wallet top-up via {payment_label}",
    )
    db.add(transaction)
    db.commit()
    return {
        "message": "Wallet funded successfully.",
        "new_balance": wallet.balance,
        "amount_added": data.amount,
        "payment_method": data.payment_method,
    }


@router.post("/paystack/initialize")
def initialize_paystack_payment(
    data: PaystackInitializeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than zero.")
    if data.payment_method not in PAYMENT_METHOD_LABELS:
        raise HTTPException(
            status_code=400,
            detail="payment_method must be one of: bank_transfer, card, ussd.",
        )
    if not current_user.email:
        raise HTTPException(status_code=400, detail="A valid user email is required to initialize payment.")

    reference = f"msw_{current_user.id}_{uuid4().hex[:20]}"
    callback_url = data.callback_url or os.getenv("PAYSTACK_CALLBACK_URL")
    payload = {
        "email": current_user.email,
        "amount": int(round(data.amount * 100)),
        "currency": "NGN",
        "reference": reference,
        "channels": PAYSTACK_CHANNELS[data.payment_method],
        "metadata": {
            "user_id": current_user.id,
            "payment_type": "wallet_top_up",
            "payment_method": data.payment_method,
        },
    }
    if callback_url:
        payload["callback_url"] = callback_url

    paystack_data = _paystack_request("POST", "/transaction/initialize", json=payload)

    payment = PaystackPayment(
        user_id=current_user.id,
        reference=reference,
        amount=data.amount,
        currency="NGN",
        payment_method=data.payment_method,
        status="pending",
        authorization_url=paystack_data.get("authorization_url"),
        access_code=paystack_data.get("access_code"),
        callback_url=callback_url,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    return {
        "message": "Paystack payment initialized.",
        "reference": payment.reference,
        "authorization_url": payment.authorization_url,
        "access_code": payment.access_code,
        "payment_method": payment.payment_method,
    }


@router.get("/paystack/verify")
def verify_paystack_payment(
    reference: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment = (
        db.query(PaystackPayment)
        .filter(
            PaystackPayment.reference == reference,
            PaystackPayment.user_id == current_user.id,
        )
        .first()
    )
    if payment is None:
        raise HTTPException(status_code=404, detail="Payment reference not found.")

    if payment.status == "success":
        wallet = get_or_create_wallet(current_user.id, db)
        return {
            "message": "Payment already verified.",
            "reference": payment.reference,
            "amount_added": payment.amount,
            "new_balance": wallet.balance,
            "payment_method": payment.payment_method,
            "status": payment.status,
        }

    paystack_data = _paystack_request("GET", f"/transaction/verify/{reference}")
    transaction_status = (paystack_data.get("status") or "").lower()
    paid_amount = (paystack_data.get("amount") or 0) / 100
    customer_email = ((paystack_data.get("customer") or {}).get("email") or "").lower()

    payment.paystack_transaction_id = str(paystack_data.get("id") or "")
    payment.channel = paystack_data.get("channel")
    payment.gateway_response = paystack_data.get("gateway_response")

    if customer_email and customer_email != (current_user.email or "").lower():
        payment.status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail="Verified payment email does not match the authenticated user.")

    if abs(paid_amount - payment.amount) > 0.001:
        payment.status = "failed"
        db.commit()
        raise HTTPException(status_code=400, detail="Verified payment amount does not match the requested wallet top-up.")

    if transaction_status != "success":
        payment.status = transaction_status or "failed"
        db.commit()
        raise HTTPException(status_code=400, detail=payment.gateway_response or "Payment was not completed successfully.")

    new_balance = _credit_verified_payment(db, payment, current_user)
    return {
        "message": "Wallet funded successfully via Paystack.",
        "reference": payment.reference,
        "amount_added": payment.amount,
        "new_balance": new_balance,
        "payment_method": payment.payment_method,
        "status": payment.status,
    }


@router.post("/pay")
def make_payment(
    data: PaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wallet = get_or_create_wallet(current_user.id, db)
    result = _apply_payment(
        db,
        current_user,
        wallet,
        data.type,
        data.amount,
        data.group_id,
        data.description,
        data.loan_id,
    )
    db.commit()
    return {
        "message": "Payment successful.",
        "amount_paid": data.amount,
        "new_balance": wallet.balance,
        "result": result,
    }


@router.post("/split-pay")
def split_payment(
    data: SplitPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not data.splits:
        raise HTTPException(status_code=400, detail="At least one split payment is required.")

    wallet = get_or_create_wallet(current_user.id, db)
    total = sum(split.amount for split in data.splits)
    if wallet.balance < total:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient balance for split payment. Need NGN {total:,.0f}, have NGN {wallet.balance:,.0f}.",
        )

    results = []
    for split in data.splits:
        results.append(
            _apply_payment(
                db,
                current_user,
                wallet,
                split.type,
                split.amount,
                split.group_id,
                split.description,
                split.loan_id,
            )
        )

    db.commit()
    return {
        "message": "Split payment successful.",
        "total_paid": total,
        "new_balance": wallet.balance,
        "splits": results,
    }
