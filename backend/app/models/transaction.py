from sqlalchemy import Column, Integer, String, Float, DateTime, func
from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    group_id = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    type = Column(String, nullable=False)  # deposit / withdrawal / loan
    description = Column(String)
    created_at = Column(DateTime, default=func.now())
