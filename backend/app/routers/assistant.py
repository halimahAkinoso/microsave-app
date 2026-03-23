from fastapi import APIRouter, Depends
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

router = APIRouter(prefix="/assistant", tags=["assistant"])


class ChatRequest(BaseModel):
    message: str


def format_money(amount: float) -> str:
    return f"NGN {amount:,.0f}"


def _loan_progress_payload(loan: Loan) -> dict:
    repayment_progress = round((loan.amount_repaid / loan.amount) * 100) if loan.amount > 0 else 0
    return {
        "amount": loan.amount,
        "amount_repaid": loan.amount_repaid,
        "remaining_balance": max(loan.amount - loan.amount_repaid, 0.0),
        "repayment_progress": repayment_progress,
        "purpose": loan.purpose,
        "status": loan.status,
    }


def get_user_context(user_id: int, db: Session) -> dict:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return {}

    membership = (
        db.query(GroupMember)
        .filter(
            GroupMember.user_id == user_id,
            GroupMember.join_status == "approved",
        )
        .first()
    )
    user_pending_membership_count = (
        db.query(GroupMember)
        .filter(
            GroupMember.user_id == user_id,
            GroupMember.join_status == "pending",
        )
        .count()
    )

    group = db.query(Group).filter(Group.id == membership.group_id).first() if membership else None
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    loans = db.query(Loan).filter(Loan.user_id == user_id).all()

    if membership and membership.role == "admin" and group is not None:
        transaction_rows = (
            db.query(Transaction)
            .filter(Transaction.group_id == group.id)
            .order_by(Transaction.created_at.desc())
            .limit(5)
            .all()
        )
        recent_transactions = []
        for transaction in transaction_rows:
            actor = db.query(User).filter(User.id == transaction.user_id).first()
            recent_transactions.append(
                {
                    "description": transaction.description or transaction.type,
                    "amount": transaction.amount,
                    "actor_name": actor.name if actor else "Unknown",
                }
            )
    else:
        recent_transactions = [
            {
                "description": transaction.description or transaction.type,
                "amount": transaction.amount,
            }
            for transaction in db.query(Transaction)
            .filter(Transaction.user_id == user_id)
            .order_by(Transaction.created_at.desc())
            .limit(5)
            .all()
        ]

    total_savings = sum(
        transaction.amount
        for transaction in db.query(Transaction)
        .filter(
            Transaction.user_id == user_id,
            Transaction.group_id == (group.id if group else -1),
            Transaction.type.in_(("contribution", "savings")),
        )
        .all()
    )

    active_loan = next((loan for loan in loans if loan.status == "active"), None)
    outstanding_total = sum(max(loan.amount - loan.amount_repaid, 0.0) for loan in loans)

    group_pending_membership_count = 0
    group_pending_loan_count = 0
    member_count = 0
    group_active_loans = []
    group_pending_loans = []
    if membership and group is not None:
        group_pending_membership_count = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group.id,
                GroupMember.join_status == "pending",
            )
            .count()
        )
        group_pending_loan_count = (
            db.query(Loan)
            .filter(
                Loan.group_id == group.id,
                Loan.status == "pending",
            )
            .count()
        )
        member_count = (
            db.query(GroupMember)
            .filter(
                GroupMember.group_id == group.id,
                GroupMember.join_status == "approved",
            )
            .count()
        )

        active_group_loans = (
            db.query(Loan)
            .filter(
                Loan.group_id == group.id,
                Loan.status == "active",
            )
            .order_by(Loan.created_at.desc())
            .all()
        )
        pending_group_loans = (
            db.query(Loan)
            .filter(
                Loan.group_id == group.id,
                Loan.status == "pending",
            )
            .order_by(Loan.created_at.desc())
            .all()
        )
        for loan in active_group_loans:
            borrower = db.query(User).filter(User.id == loan.user_id).first()
            group_active_loans.append(
                {
                    "borrower_name": borrower.name if borrower else "Unknown",
                    **_loan_progress_payload(loan),
                }
            )
        for loan in pending_group_loans:
            borrower = db.query(User).filter(User.id == loan.user_id).first()
            group_pending_loans.append(
                {
                    "borrower_name": borrower.name if borrower else "Unknown",
                    **_loan_progress_payload(loan),
                }
            )

    return {
        "name": user.name,
        "membership": {
            "group_name": group.name if group else None,
            "group_balance": group.balance if group else 0.0,
            "role": membership.role if membership else None,
            "savings_amount": group.savings_amount if group else 0.0,
            "savings_period": group.savings_period if group else None,
        }
        if membership and group
        else None,
        "wallet_balance": wallet.balance if wallet else 0.0,
        "loans": loans,
        "recent_transactions": recent_transactions,
        "total_savings": total_savings,
        "outstanding_total": outstanding_total,
        "user_pending_membership_count": user_pending_membership_count,
        "group_pending_membership_count": group_pending_membership_count,
        "group_pending_loan_count": group_pending_loan_count,
        "group_active_loans": group_active_loans,
        "group_pending_loans": group_pending_loans,
        "member_count": member_count,
        "active_loan": active_loan,
    }


def generate_response(message: str, ctx: dict) -> str:
    prompt = message.lower().strip()
    first_name = ctx.get("name", "there").split()[0]
    membership = ctx.get("membership")
    recent_transactions = ctx.get("recent_transactions", [])
    wallet_balance = ctx.get("wallet_balance", 0.0)

    if not membership:
        pending_count = ctx.get("user_pending_membership_count", 0)
        if pending_count > 0:
            return (
                f"You still have {pending_count} pending group request(s), {first_name}. "
                "Wait for admin approval before using savings, loan, and repayment features."
            )
        if "group" in prompt or "loan" in prompt or "contribution" in prompt or "savings" in prompt:
            return (
                f"You do not have an approved group yet, {first_name}. "
                "Join a group before using savings, loan, and repayment features."
            )
        return (
            f"Hello {first_name}. You are not attached to an approved group yet. "
            "Join a group first, then I can answer questions about savings, loans, and eligibility."
        )

    role_label = "admin" if membership["role"] == "admin" else "member"
    is_admin = membership["role"] == "admin"

    if any(token in prompt for token in ("hello", "hi", "hey")):
        return (
            f"Hello {first_name}. You are currently a {role_label} in {membership['group_name']}. "
            "Ask about your wallet, loans, savings, approvals, or group balance."
        )

    if is_admin and (
        "pending membership" in prompt
        or "membership request" in prompt
        or "join request" in prompt
    ):
        count = ctx.get("group_pending_membership_count", 0)
        return f"You currently have {count} pending membership request(s) waiting for review in {membership['group_name']}."

    if is_admin and (
        "pending loan" in prompt
        or "loan request" in prompt
        or "loans waiting" in prompt
    ):
        count = ctx.get("group_pending_loan_count", 0)
        if count == 0:
            return f"You currently have 0 pending loan request(s) waiting for review in {membership['group_name']}."
        lines = [
            f"{loan['borrower_name']}: requested {format_money(loan['amount'])} for {loan['purpose'] or 'no stated purpose'}"
            for loan in ctx.get("group_pending_loans", [])
        ]
        return (
            f"You currently have {count} pending loan request(s) waiting for review in {membership['group_name']}.\n"
            + "\n".join(lines)
        )

    if is_admin and (
        "who is on loan" in prompt
        or "active loans" in prompt
        or "members on loan" in prompt
        or "who still owes" in prompt
    ):
        active_group_loans = ctx.get("group_active_loans", [])
        if not active_group_loans:
            return f"No member currently has an active loan in {membership['group_name']}."
        lines = [
            f"{loan['borrower_name']}: {format_money(loan['remaining_balance'])} remaining, {loan['repayment_progress']}% repaid"
            for loan in active_group_loans
        ]
        return "Members currently on loan:\n" + "\n".join(lines)

    if is_admin and (
        "repayment progress" in prompt
        or "loan progress" in prompt
        or "member by member loan summary" in prompt
        or "loan summary" in prompt
    ):
        active_group_loans = ctx.get("group_active_loans", [])
        if not active_group_loans:
            return f"There are no active group loans to summarize in {membership['group_name']}."
        lines = [
            f"{loan['borrower_name']}: repaid {format_money(loan['amount_repaid'])} of {format_money(loan['amount'])}, {loan['repayment_progress']}% complete"
            for loan in active_group_loans
        ]
        return "Current repayment progress by borrower:\n" + "\n".join(lines)

    if is_admin and (
        "overview" in prompt
        or "summary" in prompt
        or "admin status" in prompt
    ):
        return (
            f"{membership['group_name']} has {ctx.get('member_count', 0)} approved member(s), "
            f"{ctx.get('group_pending_membership_count', 0)} pending membership request(s), "
            f"{ctx.get('group_pending_loan_count', 0)} pending loan request(s), and a current group balance of "
            f"{format_money(membership['group_balance'])}."
        )

    if "how much do i still owe" in prompt or "what do i still owe" in prompt or "loan balance" in prompt:
        if ctx["outstanding_total"] <= 0:
            return "You do not have any outstanding loan balance right now."
        return f"You still owe {format_money(ctx['outstanding_total'])} across your current loans."

    if "repayment progress" in prompt or "loan progress" in prompt or "how far along" in prompt:
        if ctx["active_loan"] is None:
            return "You do not have an active loan right now, so there is no repayment progress to track."
        progress = _loan_progress_payload(ctx["active_loan"])
        return (
            f"Your active loan is {progress['repayment_progress']}% repaid. "
            f"You have repaid {format_money(progress['amount_repaid'])} out of {format_money(progress['amount'])}, "
            f"with {format_money(progress['remaining_balance'])} remaining."
        )

    if "can i afford a loan" in prompt or "am i eligible" in prompt or "can i borrow" in prompt:
        if membership["role"] == "admin":
            return "Admins cannot request loans from the group they manage."
        if ctx["active_loan"] is not None:
            remaining = ctx["active_loan"].amount - ctx["active_loan"].amount_repaid
            return (
                f"You are not eligible for a new loan because you still have an active loan with "
                f"{format_money(remaining)} outstanding."
            )

        max_by_savings = ctx["total_savings"] * 2
        if max_by_savings <= 0:
            return (
                "You are not eligible yet because you do not have savings history in the group. "
                "Build your savings first, then your eligibility can be assessed."
            )

        affordable = min(max_by_savings, membership["group_balance"])
        return (
            f"Based on your current savings history, your savings-backed ceiling is about "
            f"{format_money(max_by_savings)}. "
            f"The group currently has {format_money(membership['group_balance'])} available, so a practical upper bound is "
            f"{format_money(affordable)}."
        )

    if "wallet" in prompt or "balance" in prompt:
        return f"Your wallet balance is {format_money(wallet_balance)}."

    if "contribution" in prompt or "dues" in prompt or "savings" in prompt:
        return (
            f"Your group savings target is {format_money(membership['savings_amount'])} per "
            f"{membership['savings_period']}. "
            f"You have saved {format_money(ctx['total_savings'])} so far."
        )

    if "group" in prompt or "membership" in prompt:
        return (
            f"You are in {membership['group_name']} as a {role_label}. "
            f"The current group balance is {format_money(membership['group_balance'])}."
        )

    if "transaction" in prompt or "recent" in prompt or "history" in prompt:
        if not recent_transactions:
            return "You do not have any recent transactions yet."
        if is_admin:
            lines = [
                f"{transaction['actor_name']} - {transaction['description']}: {format_money(transaction['amount'])}"
                for transaction in recent_transactions
            ]
            return "Recent group activity:\n" + "\n".join(lines)
        lines = [
            f"{transaction['description']}: {format_money(transaction['amount'])}"
            for transaction in recent_transactions
        ]
        return "Recent activity:\n" + "\n".join(lines)

    if "help" in prompt or "what can you do" in prompt:
        return (
            "You can ask me about your wallet balance, savings status, loan eligibility, outstanding debt, "
            "repayment progress, recent transactions, approvals, or your current group role."
        )

    return (
        f"I can help with your wallet, savings, loans, approvals, repayment progress, and group status, {first_name}. "
        "Try asking: How far along is my loan repayment? or Give me an overview of the group."
    )


@router.post("/chat")
def chat(
    data: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    context = get_user_context(current_user.id, db)
    if not context:
        return {"response": "I could not load your profile right now."}
    return {"response": generate_response(data.message, context)}
