from sqlalchemy import Column, Integer, String, Float, DateTime, func
from app.database import Base


class Group(Base):
    __tablename__ = "groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(String)
    balance = Column(Float, default=0.0)
    savings_amount = Column(Float, default=0.0)
    savings_period = Column(String, default="monthly")  # weekly / monthly
    admin_id = Column(Integer, nullable=True)  # FK to users (group head)
    created_at = Column(DateTime, default=func.now())
