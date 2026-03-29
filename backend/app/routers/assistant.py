import re

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

OPEN_LOAN_STATUSES = ("pending", "active", "overdue")
REPAYABLE_LOAN_STATUSES = ("active", "overdue")
SAVINGS_TRANSACTION_TYPES = ("contribution", "savings")


class ChatRequest(BaseModel):
    message: str


def format_money(amount: float) -> str:
    return f"NGN {amount:,.0f}"


def _contains_any(prompt: str, phrases: tuple[str, ...]) -> bool:
    return any(phrase in prompt for phrase in phrases)


def _extract_requested_amount(prompt: str) -> float | None:
    match = re.search(r"(\d[\d,]*\.?\d*)", prompt)
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", ""))
    except ValueError:
        return None


def _loan_progress_payload(loan: Loan) -> dict:
    repayment_progress = round((loan.amount_repaid / loan.amount) * 100) if loan.amount > 0 else 0
    return {
        "id": loan.id,
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
    open_loans = [loan for loan in loans if loan.status in OPEN_LOAN_STATUSES]
    repayable_loans = [loan for loan in loans if loan.status in REPAYABLE_LOAN_STATUSES]
    pending_loans = [loan for loan in loans if loan.status == "pending"]

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
                    "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
                }
            )
    else:
        recent_transactions = [
            {
                "description": transaction.description or transaction.type,
                "amount": transaction.amount,
                "created_at": transaction.created_at.isoformat() if transaction.created_at else None,
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
            Transaction.type.in_(SAVINGS_TRANSACTION_TYPES),
        )
        .all()
    )

    active_loan = next((loan for loan in loans if loan.status in REPAYABLE_LOAN_STATUSES), None)
    latest_open_loan = open_loans[0] if open_loans else None
    outstanding_total = sum(max(loan.amount - loan.amount_repaid, 0.0) for loan in repayable_loans)

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
        "latest_open_loan": latest_open_loan,
        "pending_loan_count": len(pending_loans),
        "open_loan_count": len(open_loans),
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
    latest_open_loan = ctx.get("latest_open_loan")
    active_loan = ctx.get("active_loan")
    requested_amount = _extract_requested_amount(prompt)
    savings_ceiling = ctx["total_savings"] * 2
    practical_limit = min(savings_ceiling, membership["group_balance"])

    if _contains_any(prompt, ("hello", "hi", "hey")):
        return (
            f"Hello {first_name}. You are currently a {role_label} in {membership['group_name']}. "
            "Ask about your wallet, loans, savings, approvals, or group balance."
        )

    if is_admin and _contains_any(prompt, ("pending membership", "membership request", "join request")):
        count = ctx.get("group_pending_membership_count", 0)
        return f"You currently have {count} pending membership request(s) waiting for review in {membership['group_name']}."

    if is_admin and _contains_any(prompt, ("pending loan", "loan request", "loans waiting")):
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

    if is_admin and _contains_any(prompt, ("group balance", "our balance", "available funds")):
        return f"The current group balance for {membership['group_name']} is {format_money(membership['group_balance'])}."

    if is_admin and _contains_any(prompt, ("who is on loan", "active loans", "members on loan", "who still owes")):
        active_group_loans = ctx.get("group_active_loans", [])
        if not active_group_loans:
            return f"No member currently has an active loan in {membership['group_name']}."
        lines = [
            f"{loan['borrower_name']}: {format_money(loan['remaining_balance'])} remaining, {loan['repayment_progress']}% repaid ({loan['status']})"
            for loan in active_group_loans
        ]
        return "Members currently on loan:\n" + "\n".join(lines)

    if is_admin and _contains_any(prompt, ("repayment progress", "loan progress", "member by member loan summary", "loan summary")):
        active_group_loans = ctx.get("group_active_loans", [])
        if not active_group_loans:
            return f"There are no active group loans to summarize in {membership['group_name']}."
        lines = [
            f"{loan['borrower_name']}: repaid {format_money(loan['amount_repaid'])} of {format_money(loan['amount'])}, {loan['repayment_progress']}% complete"
            for loan in active_group_loans
        ]
        return "Current repayment progress by borrower:\n" + "\n".join(lines)

    if is_admin and _contains_any(prompt, ("overview", "summary", "admin status")):
        return (
            f"{membership['group_name']} has {ctx.get('member_count', 0)} approved member(s), "
            f"{ctx.get('group_pending_membership_count', 0)} pending membership request(s), "
            f"{ctx.get('group_pending_loan_count', 0)} pending loan request(s), and a current group balance of "
            f"{format_money(membership['group_balance'])}."
        )

    if _contains_any(prompt, ("loan status", "my loan status", "pending loan", "loan request status")):
        if latest_open_loan is None:
            return "You do not have any open loan or pending loan request right now."
        if latest_open_loan.status == "pending":
            return (
                f"Your latest loan request is still pending review. You requested "
                f"{format_money(latest_open_loan.amount)} for {latest_open_loan.purpose or 'no stated purpose'}."
            )
        progress = _loan_progress_payload(latest_open_loan)
        return (
            f"Your current loan is {latest_open_loan.status}. You have repaid "
            f"{format_money(progress['amount_repaid'])} out of {format_money(progress['amount'])}, "
            f"with {format_money(progress['remaining_balance'])} remaining."
        )

    if _contains_any(prompt, ("how much do i still owe", "what do i still owe", "loan balance", "outstanding balance")):
        if ctx["outstanding_total"] <= 0:
            return "You do not have any outstanding loan balance right now."
        return f"You still owe {format_money(ctx['outstanding_total'])} across your current loans."

    if _contains_any(prompt, ("repayment progress", "loan progress", "how far along")):
        if active_loan is None:
            return "You do not have an active loan right now, so there is no repayment progress to track."
        progress = _loan_progress_payload(active_loan)
        return (
            f"Your active loan is {progress['repayment_progress']}% repaid. "
            f"You have repaid {format_money(progress['amount_repaid'])} out of {format_money(progress['amount'])}, "
            f"with {format_money(progress['remaining_balance'])} remaining."
        )

    if _contains_any(prompt, ("can i afford a loan", "am i eligible", "can i borrow", "loan eligibility")):
        if membership["role"] == "admin":
            return "Admins cannot request loans from the group they manage."
        if latest_open_loan is not None:
            if latest_open_loan.status == "pending":
                return (
                    "You are not eligible for a new loan because you already have a pending loan request in this group. "
                    "Wait for the admin to approve or decline it first."
                )
            remaining = latest_open_loan.amount - latest_open_loan.amount_repaid
            return (
                f"You are not eligible for a new loan because you still have an active loan with "
                f"{format_money(remaining)} outstanding."
            )
        if savings_ceiling <= 0:
            return (
                "You are not eligible yet because you do not have savings history in the group. "
                "The group requires savings history before a loan can be approved."
            )
        if membership["group_balance"] <= 0:
            return (
                "You have savings history, but the group balance is currently too low to fund a loan right now."
            )
        if requested_amount is not None:
            required_savings = requested_amount * 0.5
            reasons = []
            if ctx["total_savings"] < required_savings:
                reasons.append(
                    f"your savings are {format_money(ctx['total_savings'])}, but you need at least {format_money(required_savings)}"
                )
            if membership["group_balance"] < requested_amount:
                reasons.append(
                    f"the group balance is {format_money(membership['group_balance'])}, below the requested {format_money(requested_amount)}"
                )
            if reasons:
                return (
                    f"For a loan request of {format_money(requested_amount)}, you are not currently eligible because "
                    + " and ".join(reasons)
                    + "."
                )
            return (
                f"Yes. For a request of {format_money(requested_amount)}, you meet the current rule set: "
                f"approved membership, no open loan, savings of at least 50% of the amount, and enough group funds."
            )
        return (
            f"Under the current rules, you need savings equal to at least 50% of the amount you want to borrow, "
            "no open loan or pending request, approved membership, and enough group funds. "
            f"With your current savings of {format_money(ctx['total_savings'])}, your savings-backed ceiling is "
            f"{format_money(savings_ceiling)}. Given the current group balance of {format_money(membership['group_balance'])}, "
            f"your practical upper limit right now is about {format_money(practical_limit)}."
        )

    if _contains_any(prompt, ("wallet", "wallet balance")):
        return f"Your wallet balance is {format_money(wallet_balance)}."

    if _contains_any(prompt, ("contribution", "dues", "savings", "save")):
        return (
            f"Your group savings target is {format_money(membership['savings_amount'])} per "
            f"{membership['savings_period']}. "
            f"You have saved {format_money(ctx['total_savings'])} so far."
        )

    if _contains_any(prompt, ("group", "membership", "my role")):
        return (
            f"You are in {membership['group_name']} as a {role_label}. "
            f"The current group balance is {format_money(membership['group_balance'])}."
        )

    if _contains_any(prompt, ("transaction", "recent", "history")):
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

    if _contains_any(prompt, ("help", "what can you do")):
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
