from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.group_member import GroupMember
from app.models.group import Group
from app.models.loan import Loan
from app.models.transaction import Transaction
from app.models.wallet import Wallet

router = APIRouter(prefix="/assistant", tags=["assistant"])


class ChatRequest(BaseModel):
    user_id: int
    message: str


def get_user_context(user_id: int, db: Session) -> dict:
    """Fetch all relevant data for a user to power smart responses."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return {}

    # Membership
    memberships = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.join_status == "approved"
    ).all()

    groups_info = []
    for m in memberships:
        group = db.query(Group).filter(Group.id == m.group_id).first()
        if group:
            groups_info.append({
                "id": group.id,
                "name": group.name,
                "balance": group.balance,
                "contribution_amount": group.contribution_amount,
                "contribution_period": group.contribution_period,
                "role": m.role,
                "is_admin": m.role == "admin",
            })

    # Loans
    loans = db.query(Loan).filter(Loan.user_id == user_id).all()
    loans_info = []
    for l in loans:
        group = db.query(Group).filter(Group.id == l.group_id).first()
        loans_info.append({
            "id": l.id,
            "amount": l.amount,
            "amount_repaid": l.amount_repaid,
            "remaining": l.amount - l.amount_repaid,
            "purpose": l.purpose,
            "status": l.status,
            "group_name": group.name if group else "Unknown",
            "progress": round((l.amount_repaid / l.amount * 100)) if l.amount > 0 else 0,
        })

    # Wallet
    wallet = db.query(Wallet).filter(Wallet.user_id == user_id).first()
    wallet_balance = wallet.balance if wallet else 0.0

    # Recent transactions (last 5)
    recent_txns = db.query(Transaction).filter(
        Transaction.user_id == user_id
    ).order_by(Transaction.created_at.desc()).limit(5).all()

    txns_info = []
    for t in recent_txns:
        group = db.query(Group).filter(Group.id == t.group_id).first()
        txns_info.append({
            "amount": t.amount,
            "type": t.type,
            "description": t.description,
            "group_name": group.name if group else "Unknown",
        })

    # Pending join requests
    pending = db.query(GroupMember).filter(
        GroupMember.user_id == user_id,
        GroupMember.join_status == "pending"
    ).all()

    return {
        "name": user.name,
        "email": user.email,
        "groups": groups_info,
        "loans": loans_info,
        "wallet_balance": wallet_balance,
        "recent_transactions": txns_info,
        "pending_joins": len(pending),
        "is_admin_of_any": any(g["is_admin"] for g in groups_info),
    }


def fmt_naira(amount: float) -> str:
    return f"₦{amount:,.0f}"


def generate_response(message: str, ctx: dict) -> str:
    """Rule-based smart response generator using user context."""
    msg = message.lower().strip()
    name = ctx.get("name", "").split()[0] if ctx.get("name") else "there"
    groups = ctx.get("groups", [])
    loans = ctx.get("loans", [])
    wallet_balance = ctx.get("wallet_balance", 0)
    txns = ctx.get("recent_transactions", [])

    # ── Greetings ─────────────────────────────────────────────────────────────
    if any(w in msg for w in ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "howdy"]):
        group_line = f"You're a member of **{groups[0]['name']}**." if groups else "You haven't joined a group yet."
        return (
            f"Hello {name}! 👋 Welcome to MicroSave. I'm your personal finance assistant.\n\n"
            f"{group_line} How can I help you today?\n\n"
            f"You can ask me about your:\n"
            f"• 💰 Wallet balance & funding\n"
            f"• 🏦 Loan status & repayment\n"
            f"• 👥 Group membership & contributions\n"
            f"• 📊 Transaction history"
        )

    # ── Wallet / Balance ───────────────────────────────────────────────────────
    if any(w in msg for w in ["wallet", "balance", "how much do i have", "my balance", "account balance"]):
        return (
            f"💰 **Your Wallet Balance**\n\n"
            f"Current balance: **{fmt_naira(wallet_balance)}**\n\n"
            f"You can top up your wallet from the **Fund Wallet** page in the sidebar, "
            f"then use it to pay contributions or repay loans."
        )

    # ── Loans ──────────────────────────────────────────────────────────────────
    if any(w in msg for w in ["loan", "borrow", "debt", "owe", "repay", "repayment", "borrowed"]):
        if not loans:
            return (
                f"📋 You currently have **no loans** on record, {name}.\n\n"
                f"To request a loan, go to the **Loans** page and click **New Loan**. "
                f"Your group admin will review and approve it."
            )
        active_loans = [l for l in loans if l["status"] == "active"]
        pending_loans = [l for l in loans if l["status"] == "pending"]
        overdue_loans = [l for l in loans if l["status"] == "overdue"]

        parts = [f"📊 **Your Loan Summary**, {name}:\n"]
        for l in loans:
            status_emoji = {"active": "🟢", "pending": "🟡", "overdue": "🔴", "completed": "✅"}.get(l["status"], "⚪")
            parts.append(
                f"{status_emoji} **{l['group_name']}** — {fmt_naira(l['amount'])} loan\n"
                f"   Purpose: {l['purpose'] or 'Not specified'}\n"
                f"   Repaid: {fmt_naira(l['amount_repaid'])} ({l['progress']}%) · Remaining: {fmt_naira(l['remaining'])}\n"
                f"   Status: **{l['status'].capitalize()}**"
            )
        if overdue_loans:
            parts.append("\n⚠️ You have overdue loans. Please make a repayment from the **Fund Wallet** page.")
        elif active_loans:
            parts.append(f"\n✅ Keep up the repayments! You can pay from your wallet on the **Loans** page.")
        return "\n\n".join(parts)

    # ── Contribution ───────────────────────────────────────────────────────────
    if any(w in msg for w in ["contribution", "contribute", "payment", "pay", "dues", "weekly", "monthly"]):
        if not groups:
            return (
                f"You're not in any group yet, {name}. "
                f"Go to the **Groups** page to request to join one. "
                f"Your request will be reviewed by the group admin."
            )
        lines = [f"💳 **Your Group Contributions**, {name}:\n"]
        for g in groups:
            period = "week" if g["contribution_period"] == "weekly" else "month"
            lines.append(
                f"🏦 **{g['name']}**\n"
                f"   Contribution: {fmt_naira(g['contribution_amount'])} per {period}\n"
                f"   Your role: {'👑 Admin' if g['is_admin'] else '👤 Member'}\n"
                f"   Group pool: {fmt_naira(g['balance'])}"
            )
        lines.append("\nTo make a contribution, go to **Fund Wallet → Make Payment**.")
        return "\n\n".join(lines)

    # ── Group / Membership ─────────────────────────────────────────────────────
    if any(w in msg for w in ["group", "member", "membership", "join", "belong", "which group", "my group"]):
        if not groups:
            return (
                f"👥 You're not a member of any group yet, {name}.\n\n"
                f"Here's how to join:\n"
                f"1. Go to the **Groups** page\n"
                f"2. Find a group you'd like to join\n"
                f"3. Click **Request to Join**\n"
                f"4. Wait for the group admin to approve your request\n\n"
                f"Note: You can only be in **one group** at a time."
            )
        lines = [f"👥 **Your Group Membership**, {name}:\n"]
        for g in groups:
            lines.append(
                f"🏦 **{g['name']}**\n"
                f"   Role: {'👑 Group Admin' if g['is_admin'] else '👤 General Member'}\n"
                f"   Group Balance: {fmt_naira(g['balance'])}\n"
                f"   Contribution: {fmt_naira(g['contribution_amount'])}/{g['contribution_period']}"
            )
        if ctx.get("is_admin_of_any"):
            lines.append("\nAs an admin, you can approve/reject join requests on the **Groups** page.")
        return "\n\n".join(lines)

    # ── Admin ──────────────────────────────────────────────────────────────────
    if any(w in msg for w in ["admin", "approve", "approve member", "pending request", "join request"]):
        if ctx.get("is_admin_of_any"):
            admin_groups = [g for g in groups if g["is_admin"]]
            group_names = ", ".join(g["name"] for g in admin_groups)
            return (
                f"👑 **Admin Panel**, {name}\n\n"
                f"You are the admin of: **{group_names}**\n\n"
                f"As admin you can:\n"
                f"• ✅ Approve or ❌ reject member join requests\n"
                f"• 💳 Approve loan applications from members\n"
                f"• 📊 View all members' transaction history\n"
                f"• 👥 Manage member roles\n\n"
                f"Go to the **Groups** page to see pending join requests."
            )
        return (
            f"You are not currently an admin of any group, {name}. "
            f"Create a new group on the **Groups** page to become an admin."
        )

    # ── Transaction history ────────────────────────────────────────────────────
    if any(w in msg for w in ["transaction", "history", "recent", "statement", "record", "activity"]):
        if not txns:
            return f"📋 No transactions found yet, {name}. Start by funding your wallet and making a contribution."
        lines = [f"📊 **Your Recent Transactions**, {name}:\n"]
        type_emoji = {"deposit": "⬇️", "withdrawal": "⬆️", "loan": "💳"}
        for t in txns:
            emoji = type_emoji.get(t["type"], "💰")
            lines.append(f"{emoji} {t['description'] or t['type'].capitalize()} — {fmt_naira(t['amount'])} ({t['group_name']})")
        lines.append("\nView your full history on the **Transactions** page.")
        return "\n".join(lines)

    # ── How to fund / top up ────────────────────────────────────────────────────
    if any(w in msg for w in ["fund", "top up", "topup", "add money", "deposit", "recharge"]):
        return (
            f"💳 **How to Fund Your Wallet**, {name}:\n\n"
            f"1. Click **Fund Wallet** in the sidebar\n"
            f"2. Enter the amount you want to add\n"
            f"3. Click **Fund Now** (payment gateway will be integrated soon)\n\n"
            f"After funding, you can:\n"
            f"• Pay your group **contribution** directly\n"
            f"• Make a **loan repayment**\n"
            f"• Do a **split payment** across multiple purposes\n\n"
            f"Your current balance is **{fmt_naira(wallet_balance)}**."
        )

    # ── Help / What can you do ─────────────────────────────────────────────────
    if any(w in msg for w in ["help", "what can you do", "options", "menu", "assist", "support", "?"]):
        return (
            f"🤖 **MicroSave Assistant — What I Can Help With:**\n\n"
            f"💰 **Wallet** — Check balance, how to fund it\n"
            f"🏦 **Loans** — Your loan status, repayment progress, how to apply\n"
            f"💳 **Contributions** — Your dues, amounts, schedule\n"
            f"👥 **Groups** — Your membership, how to join, group info\n"
            f"👑 **Admin** — Approve members, manage your group\n"
            f"📊 **Transactions** — Recent activity, history\n\n"
            f"Just ask me anything! For example:\n"
            f'_"What is my loan balance?"_\n'
            f'_"How do I fund my wallet?"_\n'
            f'_"When is my contribution due?"_'
        )

    # ── Status ────────────────────────────────────────────────────────────────
    if any(w in msg for w in ["status", "overview", "summary", "how am i doing", "update"]):
        group_str = groups[0]["name"] if groups else "No group"
        active_loan = next((l for l in loans if l["status"] == "active"), None)
        loan_str = f"{fmt_naira(active_loan['remaining'])} remaining on active loan" if active_loan else "No active loans"
        return (
            f"📋 **Your Account Overview**, {name}:\n\n"
            f"👤 Name: {ctx.get('name')}\n"
            f"📧 Email: {ctx.get('email')}\n"
            f"👥 Group: {group_str}\n"
            f"💰 Wallet: {fmt_naira(wallet_balance)}\n"
            f"🏦 Loans: {loan_str}\n\n"
            f"Is there anything specific you'd like to know more about?"
        )

    # ── Default fallback ───────────────────────────────────────────────────────
    return (
        f"I'm not sure I understood that, {name}. 🤔\n\n"
        f"Here are some things you can ask me:\n"
        f"• _\"What is my loan balance?\"_\n"
        f"• _\"What group am I in?\"_\n"
        f"• _\"How do I fund my wallet?\"_\n"
        f"• _\"Show my recent transactions\"_\n"
        f"• _\"What is my contribution amount?\"_\n\n"
        f"Type **help** to see all options."
    )


@router.post("/chat")
def chat(data: ChatRequest, db: Session = Depends(get_db)):
    ctx = get_user_context(data.user_id, db)
    if not ctx:
        return {"response": "I couldn't find your account. Please make sure you're logged in."}
    response = generate_response(data.message, ctx)
    return {"response": response}
