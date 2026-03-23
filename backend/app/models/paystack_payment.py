from sqlalchemy import Column, Integer, String, Float, DateTime, func
from app.database import Base


class PaystackPayment(Base):
    __tablename__ = "paystack_payments"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False, index=True)
    reference = Column(String, nullable=False, unique=True, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="NGN")
    payment_method = Column(String, nullable=False, default="bank_transfer")
    status = Column(String, nullable=False, default="pending")
    authorization_url = Column(String)
    access_code = Column(String)
    callback_url = Column(String)
    paystack_transaction_id = Column(String)
    channel = Column(String)
    gateway_response = Column(String)
    verified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
