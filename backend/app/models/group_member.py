from sqlalchemy import Column, Integer, String, DateTime, func
from app.database import Base


class GroupMember(Base):
    __tablename__ = "group_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    group_id = Column(Integer, nullable=False)
    role = Column(String, default="general")         # admin / general
    join_status = Column(String, default="pending")  # pending / approved / rejected
    joined_at = Column(DateTime, default=func.now())
