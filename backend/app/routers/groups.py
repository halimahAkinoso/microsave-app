from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.user import User
from app.models.loan import Loan

router = APIRouter(prefix="/groups", tags=["groups"])


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    contribution_amount: float = 0.0
    contribution_period: str = "monthly"
    admin_id: int


class JoinRequest(BaseModel):
    user_id: int


class ApproveRequest(BaseModel):
    action: str  # "approve" or "reject"


def _group_detail(g, db):
    members = db.query(GroupMember).filter(
        GroupMember.group_id == g.id,
        GroupMember.join_status == "approved"
    ).all()
    admin = db.query(User).filter(User.id == g.admin_id).first()
    return {
        "id": g.id,
        "name": g.name,
        "description": g.description,
        "balance": g.balance,
        "contribution_amount": g.contribution_amount,
        "contribution_period": g.contribution_period,
        "admin_id": g.admin_id,
        "admin_name": admin.name if admin else "Unknown",
        "member_count": len(members),
        "created_at": g.created_at.isoformat() if g.created_at else None,
    }


@router.get("")
def list_groups(db: Session = Depends(get_db)):
    groups = db.query(Group).all()
    return [_group_detail(g, db) for g in groups]


@router.post("")
def create_group(data: GroupCreate, db: Session = Depends(get_db)):
    group = Group(
        name=data.name,
        description=data.description,
        contribution_amount=data.contribution_amount,
        contribution_period=data.contribution_period,
        admin_id=data.admin_id,
        balance=0.0,
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    # Creator auto-added as approved admin
    member = GroupMember(
        user_id=data.admin_id,
        group_id=group.id,
        role="admin",
        join_status="approved",
    )
    db.add(member)
    db.commit()
    return {"id": group.id, "message": "Group created successfully"}


@router.get("/{group_id}")
def get_group(group_id: int, db: Session = Depends(get_db)):
    g = db.query(Group).filter(Group.id == group_id).first()
    if not g:
        raise HTTPException(status_code=404, detail="Group not found")
    return _group_detail(g, db)


@router.get("/{group_id}/members")
def get_members(group_id: int, db: Session = Depends(get_db)):
    members = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.join_status == "approved"
    ).all()
    result = []
    for m in members:
        user = db.query(User).filter(User.id == m.user_id).first()
        loans = db.query(Loan).filter(
            Loan.user_id == m.user_id,
            Loan.group_id == group_id
        ).all()
        loan_info = [{"id": l.id, "amount": l.amount, "status": l.status, "purpose": l.purpose} for l in loans]
        result.append({
            "id": m.id,
            "user_id": m.user_id,
            "name": user.name if user else "Unknown",
            "email": user.email if user else "",
            "phone": user.phone if user else "",
            "occupation": user.occupation if user else "",
            "role": m.role,
            "join_status": m.join_status,
            "joined_at": m.joined_at.isoformat() if m.joined_at else None,
            "loans": loan_info,
        })
    return result


@router.post("/{group_id}/join")
def request_join(group_id: int, data: JoinRequest, db: Session = Depends(get_db)):
    # ── One-group rule: block if already approved in any group ─────────────────
    already_member = db.query(GroupMember).filter(
        GroupMember.user_id == data.user_id,
        GroupMember.join_status == "approved"
    ).first()
    if already_member:
        existing_group = db.query(Group).filter(Group.id == already_member.group_id).first()
        group_name = existing_group.name if existing_group else "a group"
        raise HTTPException(
            status_code=400,
            detail=f"You are already a member of '{group_name}'. Members can only belong to one group."
        )

    # Check if already pending or rejected for THIS specific group
    existing = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.user_id == data.user_id
    ).first()
    if existing:
        return {"message": f"Already {existing.join_status}", "status": existing.join_status}

    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    member = GroupMember(
        user_id=data.user_id,
        group_id=group_id,
        role="general",
        join_status="pending",
    )
    db.add(member)
    db.commit()
    return {"message": "Join request submitted. Awaiting admin approval.", "status": "pending"}



@router.get("/{group_id}/join-requests")
def get_join_requests(group_id: int, db: Session = Depends(get_db)):
    requests = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.join_status == "pending"
    ).all()
    result = []
    for r in requests:
        user = db.query(User).filter(User.id == r.user_id).first()
        result.append({
            "id": r.id,
            "user_id": r.user_id,
            "name": user.name if user else "Unknown",
            "email": user.email if user else "",
            "phone": user.phone if user else "",
            "occupation": user.occupation if user else "",
            "joined_at": r.joined_at.isoformat() if r.joined_at else None,
        })
    return result


@router.patch("/{group_id}/join-requests/{member_id}")
def handle_join_request(group_id: int, member_id: int, data: ApproveRequest, db: Session = Depends(get_db)):
    member = db.query(GroupMember).filter(
        GroupMember.id == member_id,
        GroupMember.group_id == group_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Join request not found")

    if data.action == "approve":
        member.join_status = "approved"
        db.commit()
        return {"message": "Member approved successfully"}
    elif data.action == "reject":
        member.join_status = "rejected"
        db.commit()
        return {"message": "Member rejected"}
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'")
