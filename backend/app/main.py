import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta

from app.database import engine, SessionLocal
from app.database import Base

# Import ALL models so Base knows about them before create_all
from app.models import user, group, loan, group_member, transaction, message, wallet  # noqa

# Import routers
from app.routers import auth, groups, loans, dashboard, transactions, members, chat, wallet as wallet_router, assistant

# ── 1. Create tables ──────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── 2. App init ───────────────────────────────────────────────────────────────
app = FastAPI(title="MicroSave API", version="1.0.0")

cors_origins = os.getenv("CORS_ORIGINS")
allowed_origins = (
    [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
    if cors_origins
    else ["http://localhost:5173", "http://localhost:5174"]
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── 3. Include routers ────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(loans.router)
app.include_router(dashboard.router)
app.include_router(transactions.router)
app.include_router(members.router)
app.include_router(chat.router)
app.include_router(wallet_router.router)
app.include_router(assistant.router)


# ── 4. Seed data ──────────────────────────────────────────────────────────────
def seed_database():
    from app.models.user import User
    from app.models.group import Group
    from app.models.loan import Loan
    from app.models.group_member import GroupMember
    from app.models.transaction import Transaction
    from app.models.message import Message

    db = SessionLocal()
    try:
        # Only seed if DB is empty
        if db.query(User).count() > 0:
            return

        now = datetime.utcnow()

        # ── Users ──────────────────────────────────────────────────────────
        users = [
            User(id=1, name="Halimah Omoakin",  email="halimah@microsave.com",  password="password123", phone="0801234567", occupation="Trader",   created_at=now - timedelta(days=90)),
            User(id=2, name="Fatima Bello",      email="fatima@microsave.com",   password="password123", phone="0802345678", occupation="Teacher",  created_at=now - timedelta(days=80)),
            User(id=3, name="Chidi Okafor",      email="chidi@microsave.com",    password="password123", phone="0803456789", occupation="Engineer", created_at=now - timedelta(days=75)),
            User(id=4, name="Amina Hassan",      email="amina@microsave.com",    password="password123", phone="0804567890", occupation="Nurse",    created_at=now - timedelta(days=60)),
            User(id=5, name="Tunde Adeyemi",     email="tunde@microsave.com",    password="password123", phone="0805678901", occupation="Farmer",   created_at=now - timedelta(days=45)),
        ]
        db.add_all(users)
        db.flush()

        # ── Groups ─────────────────────────────────────────────────────────
        groups = [
            Group(id=1, name="Market Women Alpha",    description="A cooperative for market traders",     balance=450000,   contribution_amount=5000,  contribution_period="weekly",  admin_id=1, created_at=now - timedelta(days=85)),
            Group(id=2, name="Techies Savings Pool",  description="Tech professionals savings group",     balance=1200000,  contribution_amount=20000, contribution_period="monthly", admin_id=1, created_at=now - timedelta(days=70)),
            Group(id=3, name="Agri-Grow Community",   description="Agricultural cooperative for farmers", balance=890000,   contribution_amount=2000,  contribution_period="weekly",  admin_id=5, created_at=now - timedelta(days=50)),
        ]
        db.add_all(groups)
        db.flush()

        # ── Group Members ──────────────────────────────────────────────────
        gm = [
            # Group 1: Market Women Alpha
            GroupMember(user_id=1, group_id=1, role="admin",   join_status="approved", joined_at=now - timedelta(days=85)),
            GroupMember(user_id=2, group_id=1, role="general", join_status="approved", joined_at=now - timedelta(days=80)),
            GroupMember(user_id=4, group_id=1, role="general", join_status="approved", joined_at=now - timedelta(days=60)),
            GroupMember(user_id=3, group_id=1, role="general", join_status="pending",  joined_at=now - timedelta(days=2)),   # pending join request
            # Group 2: Techies Savings Pool
            GroupMember(user_id=1, group_id=2, role="admin",   join_status="approved", joined_at=now - timedelta(days=70)),
            GroupMember(user_id=3, group_id=2, role="general", join_status="approved", joined_at=now - timedelta(days=65)),
            GroupMember(user_id=5, group_id=2, role="general", join_status="approved", joined_at=now - timedelta(days=50)),
            # Group 3: Agri-Grow Community
            GroupMember(user_id=5, group_id=3, role="admin",   join_status="approved", joined_at=now - timedelta(days=50)),
            GroupMember(user_id=1, group_id=3, role="general", join_status="approved", joined_at=now - timedelta(days=45)),
            GroupMember(user_id=2, group_id=3, role="general", join_status="approved", joined_at=now - timedelta(days=40)),
            GroupMember(user_id=4, group_id=3, role="general", join_status="approved", joined_at=now - timedelta(days=35)),
        ]
        db.add_all(gm)
        db.flush()

        # ── Loans ──────────────────────────────────────────────────────────
        loans_data = [
            Loan(user_id=2, group_id=1, amount=50000,  amount_repaid=25000,  purpose="Buy trading goods",         status="active",    created_at=now - timedelta(days=30)),
            Loan(user_id=3, group_id=2, amount=100000, amount_repaid=100000, purpose="Laptop purchase",           status="completed", created_at=now - timedelta(days=60)),
            Loan(user_id=4, group_id=1, amount=30000,  amount_repaid=0,      purpose="Medical expenses",          status="pending",   created_at=now - timedelta(days=5)),
            Loan(user_id=2, group_id=3, amount=25000,  amount_repaid=5000,   purpose="Farm equipment",            status="overdue",   created_at=now - timedelta(days=45)),
            Loan(user_id=5, group_id=3, amount=80000,  amount_repaid=40000,  purpose="Irrigation system install", status="active",    created_at=now - timedelta(days=20)),
        ]
        db.add_all(loans_data)
        db.flush()

        # ── Transactions ───────────────────────────────────────────────────
        txns = [
            Transaction(user_id=1, group_id=1, amount=5000,   type="deposit",    description="Weekly contribution",        created_at=now - timedelta(days=7)),
            Transaction(user_id=2, group_id=1, amount=5000,   type="deposit",    description="Weekly contribution",        created_at=now - timedelta(days=7)),
            Transaction(user_id=4, group_id=1, amount=5000,   type="deposit",    description="Weekly contribution",        created_at=now - timedelta(days=7)),
            Transaction(user_id=2, group_id=1, amount=50000,  type="loan",       description="Loan disbursement",          created_at=now - timedelta(days=30)),
            Transaction(user_id=2, group_id=1, amount=25000,  type="deposit",    description="Loan repayment — 1st half",  created_at=now - timedelta(days=15)),
            Transaction(user_id=1, group_id=2, amount=20000,  type="deposit",    description="Monthly contribution",       created_at=now - timedelta(days=14)),
            Transaction(user_id=3, group_id=2, amount=20000,  type="deposit",    description="Monthly contribution",       created_at=now - timedelta(days=14)),
            Transaction(user_id=3, group_id=2, amount=100000, type="loan",       description="Loan disbursement",          created_at=now - timedelta(days=60)),
            Transaction(user_id=3, group_id=2, amount=100000, type="deposit",    description="Full loan repayment",        created_at=now - timedelta(days=20)),
            Transaction(user_id=5, group_id=3, amount=2000,   type="deposit",    description="Weekly contribution",        created_at=now - timedelta(days=7)),
            Transaction(user_id=5, group_id=3, amount=80000,  type="loan",       description="Loan disbursement",          created_at=now - timedelta(days=20)),
            Transaction(user_id=2, group_id=3, amount=25000,  type="loan",       description="Loan disbursement",          created_at=now - timedelta(days=45)),
        ]
        db.add_all(txns)
        db.flush()

        # ── Chat Messages ──────────────────────────────────────────────────
        msgs = [
            Message(sender_id=1, group_id=1, content="Good morning everyone! Reminder — weekly contribution is due this Friday. 🙏",           created_at=now - timedelta(days=3, hours=8)),
            Message(sender_id=2, group_id=1, content="Thank you Halimah! Already made my payment 😊",                                          created_at=now - timedelta(days=3, hours=7)),
            Message(sender_id=4, group_id=1, content="Mine too! Quick question — can we increase the contribution next month?",                  created_at=now - timedelta(days=3, hours=6)),
            Message(sender_id=1, group_id=1, content="Great idea Amina! Let's discuss at our next meeting.",                                    created_at=now - timedelta(days=3, hours=5)),
            Message(sender_id=1, group_id=2, content="Hello Techies! Monthly contributions are open. Please pay before the 25th.",              created_at=now - timedelta(days=10, hours=9)),
            Message(sender_id=3, group_id=2, content="Done! Quick update — I've fully repaid my loan. 🎉",                                      created_at=now - timedelta(days=10, hours=8)),
            Message(sender_id=5, group_id=2, content="Congrats Chidi! 🎊",                                                                     created_at=now - timedelta(days=10, hours=7)),
            Message(sender_id=5, group_id=3, content="Good day farmers! Season planting is coming. Anyone needing a loan should apply now.",    created_at=now - timedelta(days=5, hours=10)),
            Message(sender_id=2, group_id=3, content="Thank you Tunde. I'll submit my request today.",                                          created_at=now - timedelta(days=5, hours=9)),
        ]
        db.add_all(msgs)
        db.commit()
        print("✅ Seed data loaded successfully.")

    except Exception as e:
        db.rollback()
        print(f"⚠️  Seed error: {e}")
    finally:
        db.close()


seed_database()


@app.get("/")
def root():
    return {"message": "MicroSave API is running 🚀", "docs": "/docs"}
