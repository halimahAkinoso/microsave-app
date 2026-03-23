from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.loan import Loan
from app.models.user import User
from app.services.auth_service import get_current_user, get_user_membership, serialize_membership

router = APIRouter(prefix="/groups", tags=["groups"])


class GroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    savings_amount: float = 0.0
    savings_period: str = "monthly"


class ApproveRequest(BaseModel):
    action: str


def _normalize_role(value: str) -> str:
    return "admin" if value == "admin" else "member"


def _approved_membership(db: Session, user_id: int, group_id: int | None = None) -> Optional[GroupMember]:
    query = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.join_status == "approved",
    )
    if group_id is not None:
        query = query.filter(GroupMember.group_id == group_id)
    return query.first()


def _require_group_admin(db: Session, user_id: int, group_id: int) -> GroupMember:
    membership = _approved_membership(db, user_id, group_id)
    if membership is None or _normalize_role(membership.role) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group admin can perform this action.",
        )
    return membership


def _group_detail(group: Group, db: Session, viewer_id: Optional[int] = None) -> dict:
    members = db.query(GroupMember).filter(
        GroupMember.group_id == group.id,
        GroupMember.join_status == "approved",
    ).all()
    admin = db.query(User).filter(User.id == group.admin_id).first()
    viewer_membership = None
    if viewer_id is not None:
        viewer_membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group.id,
                GroupMember.user_id == viewer_id,
            )
            .first()
        )

    return {
        "id": group.id,
        "name": group.name,
        "description": group.description,
        "balance": group.balance,
        "savings_amount": group.savings_amount,
        "savings_period": group.savings_period,
        "admin_id": group.admin_id,
        "admin_name": admin.name if admin else "Unknown",
        "member_count": len(members),
        "created_at": group.created_at.isoformat() if group.created_at else None,
        "viewer_membership": serialize_membership(db, viewer_membership),
    }


@router.get("")
def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    groups = db.query(Group).order_by(Group.created_at.desc()).all()
    return [_group_detail(group, db, current_user.id) for group in groups]


@router.post("")
def create_group(
    data: GroupCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing_admin_group = db.query(Group).filter(Group.admin_id == current_user.id).first()
    if existing_admin_group is not None:
        raise HTTPException(
            status_code=400,
            detail="You are already the admin of another group.",
        )

    locked_membership = get_user_membership(db, current_user.id, ("approved", "pending"))
    if locked_membership is not None:
        detail = "You already belong to a group." if locked_membership.join_status == "approved" else "You already have a pending group request."
        raise HTTPException(status_code=400, detail=detail)

    group = Group(
        name=data.name,
        description=data.description,
        savings_amount=data.savings_amount,
        savings_period=data.savings_period,
        admin_id=current_user.id,
        balance=0.0,
    )
    db.add(group)
    db.commit()
    db.refresh(group)

    member = GroupMember(
        user_id=current_user.id,
        group_id=group.id,
        role="admin",
        join_status="approved",
    )
    db.add(member)
    db.commit()

    return {
        "message": "Group created successfully.",
        "group": _group_detail(group, db, current_user.id),
    }


@router.get("/my-membership")
def get_my_membership(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = get_user_membership(db, current_user.id, ("approved", "pending"))
    if membership is None:
        return {"membership": None}

    group = db.query(Group).filter(Group.id == membership.group_id).first()
    return {
        "membership": serialize_membership(db, membership),
        "group": _group_detail(group, db, current_user.id) if group else None,
    }


@router.get("/{group_id}")
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")
    return _group_detail(group, db, current_user.id)


@router.get("/{group_id}/members")
def get_members(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    current_membership = _approved_membership(db, current_user.id, group_id)
    if current_membership is None:
        raise HTTPException(status_code=403, detail="You must belong to this group to view members.")

    members_query = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.join_status == "approved",
    )
    if _normalize_role(current_membership.role) != "admin":
        members_query = members_query.filter(GroupMember.user_id == current_user.id)

    members = members_query.all()
    result = []
    for membership in members:
        user = db.query(User).filter(User.id == membership.user_id).first()
        loans = db.query(Loan).filter(
            Loan.user_id == membership.user_id,
            Loan.group_id == group_id,
        ).all()
        result.append(
            {
                "id": membership.id,
                "user_id": membership.user_id,
                "name": user.name if user else "Unknown",
                "email": user.email if user else "",
                "phone": user.phone if user else "",
                "occupation": user.occupation if user else "",
                "role": _normalize_role(membership.role),
                "join_status": membership.join_status,
                "joined_at": membership.joined_at.isoformat() if membership.joined_at else None,
                "loans": [
                    {
                        "id": loan.id,
                        "amount": loan.amount,
                        "status": loan.status,
                        "purpose": loan.purpose,
                    }
                    for loan in loans
                ],
            }
        )
    return result


@router.post("/{group_id}/join")
def request_join(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    group = db.query(Group).filter(Group.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    existing_locked_membership = get_user_membership(db, current_user.id, ("approved", "pending"))
    if existing_locked_membership is not None:
        if existing_locked_membership.group_id == group_id:
            detail = (
                "You are already a member of this group."
                if existing_locked_membership.join_status == "approved"
                else "You already have a pending request for this group."
            )
            raise HTTPException(status_code=400, detail=detail)

        existing_group = db.query(Group).filter(Group.id == existing_locked_membership.group_id).first()
        group_name = existing_group.name if existing_group else "another group"
        raise HTTPException(
            status_code=400,
            detail=f"You already have an active membership flow with {group_name}. Members can only belong to one group at a time.",
        )

    existing_membership = (
        db.query(GroupMember)
        .filter(
            GroupMember.group_id == group_id,
            GroupMember.user_id == current_user.id,
        )
        .first()
    )
    if existing_membership is not None:
        existing_membership.join_status = "pending"
        existing_membership.role = "member"
        db.commit()
        return {"message": "Join request resubmitted.", "status": "pending"}

    membership = GroupMember(
        user_id=current_user.id,
        group_id=group_id,
        role="member",
        join_status="pending",
    )
    db.add(membership)
    db.commit()
    return {"message": "Join request submitted.", "status": "pending"}


@router.get("/{group_id}/join-requests")
def get_join_requests(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_group_admin(db, current_user.id, group_id)
    requests = db.query(GroupMember).filter(
        GroupMember.group_id == group_id,
        GroupMember.join_status == "pending",
    ).all()
    result = []
    for membership in requests:
        user = db.query(User).filter(User.id == membership.user_id).first()
        result.append(
            {
                "id": membership.id,
                "user_id": membership.user_id,
                "name": user.name if user else "Unknown",
                "email": user.email if user else "",
                "phone": user.phone if user else "",
                "occupation": user.occupation if user else "",
                "joined_at": membership.joined_at.isoformat() if membership.joined_at else None,
            }
        )
    return result


@router.patch("/{group_id}/join-requests/{member_id}")
def handle_join_request(
    group_id: int,
    member_id: int,
    data: ApproveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _require_group_admin(db, current_user.id, group_id)
    membership = db.query(GroupMember).filter(
        GroupMember.id == member_id,
        GroupMember.group_id == group_id,
    ).first()
    if not membership:
        raise HTTPException(status_code=404, detail="Join request not found")

    if data.action == "approve":
        competing_membership = (
            db.query(GroupMember)
            .filter(
                GroupMember.user_id == membership.user_id,
                GroupMember.id != membership.id,
                GroupMember.join_status.in_(("approved", "pending")),
            )
            .first()
        )
        if competing_membership is not None:
            raise HTTPException(
                status_code=400,
                detail="This user already has another active membership or pending request.",
            )
        membership.join_status = "approved"
        membership.role = "member"
        db.commit()
        return {"message": "Member approved successfully."}

    if data.action == "reject":
        membership.join_status = "rejected"
        membership.role = "member"
        db.commit()
        return {"message": "Member rejected."}

    raise HTTPException(status_code=400, detail="Invalid action. Use 'approve' or 'reject'.")
