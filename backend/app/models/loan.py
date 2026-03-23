from sqlalchemy import Column, Integer, String, Float, DateTime, func
from app.database import Base


class Loan(Base):
    __tablename__ = "loans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    group_id = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    amount_repaid = Column(Float, default=0.0)
    purpose = Column(String)
    status = Column(String, default="pending")  # pending / active / overdue / completed / declined
    created_at = Column(DateTime, default=func.now())
