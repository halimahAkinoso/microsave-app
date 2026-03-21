from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.group_member import GroupMember
from app.models.group import Group
from app.models.loan import Loan

router = APIRouter(prefix="/members", tags=["members"])


class RoleUpdate(BaseModel):
    role: str  # admin / general


@router.get("")
def list_all_members(db: Session = Depends(get_db)):
    members = db.query(GroupMember).filter(GroupMember.join_status == "approved").all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        group = db.query(Group).filter(Group.id == m.group_id).first()
        loans = db.query(Loan).filter(Loan.user_id == m.user_id, Loan.group_id == m.group_id).all()
        loan_info = [{"id": l.id, "amount": l.amount, "status": l.status} for l in loans]
        result.append({
            "id": m.id,
            "user_id": m.user_id,
            "name": user.name if user else "Unknown",
            "email": user.email if user else "",
            "phone": user.phone if user else "",
            "occupation": user.occupation if user else "",
            "group_id": m.group_id,
            "group_name": group.name if group else "Unknown",
            "role": m.role,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            "loans": loan_info,
        })
    return result


@router.patch("/{member_id}/role")
def update_role(member_id: int, data: RoleUpdate, db: Session = Depends(get_db)):
    member = db.query(GroupMember).filter(GroupMember.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    if data.role not in ["admin", "general"]:
        raise HTTPException(status_code=400, detail="Role must be 'admin' or 'general'")
    member.role = data.role
    db.commit()
    return {"message": "Role updated", "role": member.role}
