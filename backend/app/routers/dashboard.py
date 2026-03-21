from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.loan import Loan
from app.models.group import Group
from app.models.user import User
from app.models.group_member import GroupMember
from app.models.transaction import Transaction

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/stats")
def get_stats(db: Session = Depends(get_db)):
    total_groups = db.query(Group).count()
    total_members = db.query(User).count()
    total_savings = db.query(func.sum(Group.balance)).scalar() or 0
    active_loans_count = db.query(Loan).filter(Loan.status == "active").count()

    # Repayment rate
    all_loans = db.query(Loan).all()
    completed = sum(1 for l in all_loans if l.status == "completed")
    repayment_rate = round((completed / len(all_loans)) * 100) if all_loans else 0

    # Active groups (groups with at least 1 approved member)
    active_groups = db.query(GroupMember.group_id).filter(
        GroupMember.join_status == "approved"
    ).distinct().count()

    # Recent 10 transactions
    recent_txns = db.query(Transaction).order_by(Transaction.created_at.desc()).limit(10).all()
    recent = []
    for t in recent_txns:
        user = db.query(User).filter(User.id == t.user_id).first()
        group = db.query(Group).filter(Group.id == t.group_id).first()
        recent.append({
            "id": t.id,
            "user_name": user.name if user else "Unknown",
            "group_name": group.name if group else "Unknown",
            "amount": t.amount,
            "type": t.type,
            "description": t.description,
            "created_at": t.created_at.isoformat() if t.created_at else None,
        })

    # Top 5 groups by balance
    top_groups_raw = db.query(Group).order_by(Group.balance.desc()).limit(5).all()
    top_groups = []
    for g in top_groups_raw:
        mc = db.query(GroupMember).filter(
            GroupMember.group_id == g.id, GroupMember.join_status == "approved"
        ).count()
        admin = db.query(User).filter(User.id == g.admin_id).first()
        top_groups.append({
            "id": g.id,
            "name": g.name,
            "balance": g.balance,
            "member_count": mc,
            "admin_name": admin.name if admin else "Unknown",
        })

    return {
        "total_groups": total_groups,
        "active_groups": active_groups,
        "total_members": total_members,
        "total_savings": total_savings,
        "active_loans": active_loans_count,
        "repayment_rate": repayment_rate,
        "recent_transactions": recent,
        "top_groups": top_groups,
    }
