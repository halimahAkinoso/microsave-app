from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.group import Group
from app.models.group_member import GroupMember
from app.models.loan import Loan
from app.models.transaction import Transaction
from app.models.user import User
from app.models.wallet import Wallet
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/members", tags=["members"])


class RoleUpdate(BaseModel):
    role: str


def _approved_membership(db: Session, user_id: int) -> GroupMember | None:
    return (
        db.query(GroupMember)
        .filter(
            GroupMember.user_id == user_id,
            GroupMember.join_status == "approved",
        )
        .first()
    )


def _contribution_total(db: Session, user_id: int, group_id: int) -> float:
    contribution_rows = (
        db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.group_id == group_id,
        )
        .all()
    )
    return sum(
        row.amount
        for row in contribution_rows
        if row.type in ("contribution", "savings")
        or (
            row.type == "deposit"
            and any(token in (row.description or "").lower() for token in ("contribution", "savings"))
        )
    )


@router.get("")
def list_group_members(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    membership = _approved_membership(db, current_user.id)
    if membership is None:
        return []

    members_query = db.query(GroupMember).filter(
        GroupMember.group_id == membership.group_id,
        GroupMember.join_status == "approved",
    )
    if membership.role != "admin":
        members_query = members_query.filter(GroupMember.user_id == current_user.id)

    members = members_query.all()
    group = db.query(Group).filter(Group.id == membership.group_id).first()

    result = []
    for member in members:
        user = db.query(User).filter(User.id == member.user_id).first()
        wallet = db.query(Wallet).filter(Wallet.user_id == member.user_id).first()
        loans = (
            db.query(Loan)
            .filter(Loan.user_id == member.user_id, Loan.group_id == member.group_id)
            .order_by(Loan.created_at.desc(), Loan.id.desc())
            .all()
        )
        loan_items = [
            {
                "id": loan.id,
                "amount": loan.amount,
                "amount_repaid": loan.amount_repaid,
                "remaining_balance": max(loan.amount - loan.amount_repaid, 0.0),
                "repayment_progress": round((loan.amount_repaid / loan.amount) * 100)
                if loan.amount > 0
                else 0,
                "status": loan.status,
                "purpose": loan.purpose,
                "created_at": loan.created_at.isoformat() if loan.created_at else None,
            }
            for loan in loans
        ]
        current_loan = next(
            (
                loan
                for loan in loan_items
                if loan["status"] in ("pending", "active", "overdue")
            ),
            None,
        )
        contribution_total = _contribution_total(db, member.user_id, member.group_id)
        outstanding_total = sum(loan["remaining_balance"] for loan in loan_items)

        result.append(
            {
                "id": member.id,
                "user_id": member.user_id,
                "name": user.name if user else "Unknown",
                "email": user.email if user else "",
                "phone": user.phone if user else "",
                "occupation": user.occupation if user else "",
                "group_id": member.group_id,
                "group_name": group.name if group else "Unknown",
                "role": "admin" if member.role == "admin" else "member",
                "joined_at": member.joined_at.isoformat() if member.joined_at else None,
                "is_self": member.user_id == current_user.id,
                "total_savings": contribution_total,
                "wallet_balance": wallet.balance if wallet and member.user_id == current_user.id else None,
                "outstanding_balance": outstanding_total,
                "loan_count": len(loan_items),
                "current_loan": current_loan,
                "loans": loan_items,
            }
        )
    return result


@router.patch("/{member_id}/role")
def update_role(
    member_id: int,
    data: RoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    admin_membership = _approved_membership(db, current_user.id)
    if admin_membership is None or admin_membership.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the group admin can update member roles.",
        )

    member = db.query(GroupMember).filter(GroupMember.id == member_id).first()
    if member is None or member.group_id != admin_membership.group_id:
        raise HTTPException(status_code=404, detail="Member not found in your group.")

    if data.role not in ("admin", "member"):
        raise HTTPException(status_code=400, detail="Role must be admin or member.")

    group = db.query(Group).filter(Group.id == admin_membership.group_id).first()
    if group is None:
        raise HTTPException(status_code=404, detail="Group not found.")

    if data.role == "admin":
        existing_admin_group = (
            db.query(Group)
            .filter(
                Group.admin_id == member.user_id,
                Group.id != group.id,
            )
            .first()
        )
        if existing_admin_group is not None:
            raise HTTPException(
                status_code=400,
                detail="This member is already the admin of another group.",
            )
        current_admin = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group.id,
                GroupMember.join_status == "approved",
                GroupMember.role == "admin",
            )
            .first()
        )
        if current_admin and current_admin.id != member.id:
            current_admin.role = "member"
        member.role = "admin"
        group.admin_id = member.user_id
    else:
        if member.role == "admin":
            raise HTTPException(
                status_code=400,
                detail="Transfer admin role to another member before demoting the current admin.",
            )
        member.role = "member"

    db.commit()
    return {"message": "Role updated successfully.", "role": member.role}
