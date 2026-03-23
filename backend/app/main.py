import os
from datetime import datetime, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect

from app.database import SessionLocal, engine
from app.models import group, group_member, loan, message, paystack_payment, transaction, user, wallet  # noqa: F401
from app.routers import (
    assistant,
    auth,
    chat,
    dashboard,
    groups,
    loans,
    members,
    transactions,
    wallet as wallet_router,
)
from app.services.auth_service import hash_password, is_password_hash

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

app.include_router(auth.router)
app.include_router(groups.router)
app.include_router(loans.router)
app.include_router(dashboard.router)
app.include_router(transactions.router)
app.include_router(members.router)
app.include_router(chat.router)
app.include_router(wallet_router.router)
app.include_router(assistant.router)


def seed_database() -> None:
    from app.models.group import Group
    from app.models.group_member import GroupMember
    from app.models.loan import Loan
    from app.models.message import Message
    from app.models.transaction import Transaction
    from app.models.user import User
    from app.models.wallet import Wallet

    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            return

        now = datetime.utcnow()
        users = [
            User(
                id=1,
                name="Halimah Omoakin",
                email="halimah@microsave.com",
                password=hash_password("password123"),
                phone="0801234567",
                occupation="Trader",
                created_at=now - timedelta(days=90),
            ),
            User(
                id=2,
                name="Fatima Bello",
                email="fatima@microsave.com",
                password=hash_password("password123"),
                phone="0802345678",
                occupation="Teacher",
                created_at=now - timedelta(days=80),
            ),
            User(
                id=3,
                name="Chidi Okafor",
                email="chidi@microsave.com",
                password=hash_password("password123"),
                phone="0803456789",
                occupation="Engineer",
                created_at=now - timedelta(days=75),
            ),
            User(
                id=4,
                name="Amina Hassan",
                email="amina@microsave.com",
                password=hash_password("password123"),
                phone="0804567890",
                occupation="Nurse",
                created_at=now - timedelta(days=60),
            ),
            User(
                id=5,
                name="Tunde Adeyemi",
                email="tunde@microsave.com",
                password=hash_password("password123"),
                phone="0805678901",
                occupation="Farmer",
                created_at=now - timedelta(days=45),
            ),
            User(
                id=6,
                name="Bisi Adebayo",
                email="bisi@microsave.com",
                password=hash_password("password123"),
                phone="0806789012",
                occupation="Designer",
                created_at=now - timedelta(days=40),
            ),
            User(
                id=7,
                name="Sade Ogunleye",
                email="sade@microsave.com",
                password=hash_password("password123"),
                phone="0807890123",
                occupation="Tailor",
                created_at=now - timedelta(days=20),
            ),
        ]
        db.add_all(users)
        db.flush()

        groups_data = [
            Group(
                id=1,
                name="Market Women Alpha",
                description="A cooperative for market traders",
                balance=450000,
                savings_amount=5000,
                savings_period="weekly",
                admin_id=1,
                created_at=now - timedelta(days=85),
            ),
            Group(
                id=2,
                name="Techies Savings Pool",
                description="Tech professionals savings group",
                balance=1200000,
                savings_amount=20000,
                savings_period="monthly",
                admin_id=6,
                created_at=now - timedelta(days=70),
            ),
            Group(
                id=3,
                name="Agri-Grow Community",
                description="Agricultural cooperative for farmers",
                balance=890000,
                savings_amount=2000,
                savings_period="weekly",
                admin_id=5,
                created_at=now - timedelta(days=50),
            ),
        ]
        db.add_all(groups_data)
        db.flush()

        memberships = [
            GroupMember(user_id=1, group_id=1, role="admin", join_status="approved", joined_at=now - timedelta(days=85)),
            GroupMember(user_id=2, group_id=1, role="member", join_status="approved", joined_at=now - timedelta(days=80)),
            GroupMember(user_id=7, group_id=1, role="member", join_status="pending", joined_at=now - timedelta(days=2)),
            GroupMember(user_id=6, group_id=2, role="admin", join_status="approved", joined_at=now - timedelta(days=70)),
            GroupMember(user_id=3, group_id=2, role="member", join_status="approved", joined_at=now - timedelta(days=65)),
            GroupMember(user_id=5, group_id=3, role="admin", join_status="approved", joined_at=now - timedelta(days=50)),
            GroupMember(user_id=4, group_id=3, role="member", join_status="approved", joined_at=now - timedelta(days=35)),
        ]
        db.add_all(memberships)
        db.flush()

        wallets_data = [
            Wallet(user_id=1, balance=15000),
            Wallet(user_id=2, balance=32000),
            Wallet(user_id=3, balance=25000),
            Wallet(user_id=4, balance=12000),
            Wallet(user_id=5, balance=40000),
            Wallet(user_id=6, balance=18000),
            Wallet(user_id=7, balance=5000),
        ]
        db.add_all(wallets_data)
        db.flush()

        loans_data = [
            Loan(
                user_id=2,
                group_id=1,
                amount=50000,
                amount_repaid=25000,
                purpose="Buy trading goods",
                status="active",
                created_at=now - timedelta(days=30),
            ),
            Loan(
                user_id=3,
                group_id=2,
                amount=100000,
                amount_repaid=100000,
                purpose="Laptop purchase",
                status="completed",
                created_at=now - timedelta(days=60),
            ),
            Loan(
                user_id=4,
                group_id=3,
                amount=30000,
                amount_repaid=0,
                purpose="Medical expenses",
                status="pending",
                created_at=now - timedelta(days=5),
            ),
        ]
        db.add_all(loans_data)
        db.flush()

        transactions_data = [
            Transaction(
                user_id=1,
                group_id=0,
                amount=15000,
                type="top_up",
                description="Wallet top-up",
                created_at=now - timedelta(days=21),
            ),
            Transaction(
                user_id=2,
                group_id=0,
                amount=40000,
                type="top_up",
                description="Wallet top-up",
                created_at=now - timedelta(days=22),
            ),
            Transaction(
                user_id=2,
                group_id=1,
                amount=5000,
                type="contribution",
                description="Weekly contribution",
                created_at=now - timedelta(days=21),
            ),
            Transaction(
                user_id=2,
                group_id=1,
                amount=5000,
                type="contribution",
                description="Weekly contribution",
                created_at=now - timedelta(days=14),
            ),
            Transaction(
                user_id=2,
                group_id=1,
                amount=50000,
                type="loan",
                description="Loan disbursement for Buy trading goods",
                created_at=now - timedelta(days=30),
            ),
            Transaction(
                user_id=2,
                group_id=1,
                amount=25000,
                type="loan_repayment",
                description="Loan repayment",
                created_at=now - timedelta(days=15),
            ),
            Transaction(
                user_id=6,
                group_id=0,
                amount=18000,
                type="top_up",
                description="Wallet top-up",
                created_at=now - timedelta(days=18),
            ),
            Transaction(
                user_id=3,
                group_id=0,
                amount=45000,
                type="top_up",
                description="Wallet top-up",
                created_at=now - timedelta(days=18),
            ),
            Transaction(
                user_id=3,
                group_id=2,
                amount=20000,
                type="contribution",
                description="Monthly contribution",
                created_at=now - timedelta(days=28),
            ),
            Transaction(
                user_id=3,
                group_id=2,
                amount=40000,
                type="contribution",
                description="Monthly contribution",
                created_at=now - timedelta(days=12),
            ),
            Transaction(
                user_id=3,
                group_id=2,
                amount=100000,
                type="loan",
                description="Loan disbursement for Laptop purchase",
                created_at=now - timedelta(days=60),
            ),
            Transaction(
                user_id=3,
                group_id=2,
                amount=100000,
                type="loan_repayment",
                description="Full loan repayment",
                created_at=now - timedelta(days=20),
            ),
            Transaction(
                user_id=5,
                group_id=0,
                amount=40000,
                type="top_up",
                description="Wallet top-up",
                created_at=now - timedelta(days=16),
            ),
            Transaction(
                user_id=4,
                group_id=0,
                amount=12000,
                type="top_up",
                description="Wallet top-up",
                created_at=now - timedelta(days=16),
            ),
            Transaction(
                user_id=4,
                group_id=3,
                amount=2000,
                type="contribution",
                description="Weekly contribution",
                created_at=now - timedelta(days=21),
            ),
            Transaction(
                user_id=4,
                group_id=3,
                amount=2000,
                type="contribution",
                description="Weekly contribution",
                created_at=now - timedelta(days=14),
            ),
            Transaction(
                user_id=4,
                group_id=3,
                amount=2000,
                type="contribution",
                description="Weekly contribution",
                created_at=now - timedelta(days=7),
            ),
        ]
        db.add_all(transactions_data)
        db.flush()

        messages_data = [
            Message(
                sender_id=1,
                group_id=1,
                content="Good morning everyone. Weekly contributions are due on Friday.",
                created_at=now - timedelta(days=3, hours=8),
            ),
            Message(
                sender_id=2,
                group_id=1,
                content="Payment done. I will also send my repayment this week.",
                created_at=now - timedelta(days=3, hours=7),
            ),
            Message(
                sender_id=6,
                group_id=2,
                content="Monthly contributions for Techies Savings Pool are open.",
                created_at=now - timedelta(days=10, hours=9),
            ),
            Message(
                sender_id=3,
                group_id=2,
                content="My laptop loan has been fully repaid.",
                created_at=now - timedelta(days=10, hours=8),
            ),
            Message(
                sender_id=5,
                group_id=3,
                content="Loan requests for planting season are now under review.",
                created_at=now - timedelta(days=5, hours=10),
            ),
            Message(
                sender_id=4,
                group_id=3,
                content="I have submitted my request for medical expenses support.",
                created_at=now - timedelta(days=5, hours=9),
            ),
        ]
        db.add_all(messages_data)
        db.commit()
        print("MicroSave seed data loaded.")
    except Exception as exc:
        db.rollback()
        print(f"Seed error: {exc}")
    finally:
        db.close()


def normalize_legacy_data() -> None:
    from app.models.group import Group
    from app.models.group_member import GroupMember
    from app.models.transaction import Transaction
    from app.models.user import User
    from app.models.wallet import Wallet

    db = SessionLocal()
    try:
        changed = False
        groups_data = db.query(Group).all()

        for group_record in groups_data:
            if group_record.admin_id is None:
                continue

            admin_membership = (
                db.query(GroupMember)
                .filter(
                    GroupMember.user_id == group_record.admin_id,
                    GroupMember.group_id == group_record.id,
                )
                .order_by(GroupMember.joined_at.desc(), GroupMember.id.desc())
                .first()
            )
            if admin_membership is None:
                admin_membership = GroupMember(
                    user_id=group_record.admin_id,
                    group_id=group_record.id,
                    role="admin",
                    join_status="approved",
                )
                db.add(admin_membership)
                db.flush()
                changed = True
            else:
                if admin_membership.role != "admin":
                    admin_membership.role = "admin"
                    changed = True
                if admin_membership.join_status != "approved":
                    admin_membership.join_status = "approved"
                    changed = True

        admin_group_by_user = {
            group_record.admin_id: group_record.id
            for group_record in groups_data
            if group_record.admin_id is not None
        }

        for user_record in db.query(User).all():
            if not is_password_hash(user_record.password):
                user_record.password = hash_password(user_record.password)
                changed = True

            memberships = (
                db.query(GroupMember)
                .filter(GroupMember.user_id == user_record.id)
                .order_by(GroupMember.joined_at.desc(), GroupMember.id.desc())
                .all()
            )
            if not memberships:
                continue

            primary_membership = None
            admin_group_id = admin_group_by_user.get(user_record.id)

            if admin_group_id is not None:
                primary_membership = next(
                    (membership for membership in memberships if membership.group_id == admin_group_id),
                    None,
                )
            if primary_membership is None:
                primary_membership = next(
                    (membership for membership in memberships if membership.join_status == "approved"),
                    None,
                )
            if primary_membership is None:
                primary_membership = next(
                    (membership for membership in memberships if membership.join_status == "pending"),
                    None,
                )

            for membership in memberships:
                expected_role = (
                    "admin"
                    if admin_group_id is not None and membership.group_id == admin_group_id
                    else "member"
                )
                if membership.role != expected_role:
                    membership.role = expected_role
                    changed = True

                if primary_membership is not None and membership.id == primary_membership.id:
                    desired_status = (
                        "approved"
                        if admin_group_id is not None and membership.group_id == admin_group_id
                        else membership.join_status
                    )
                elif membership.join_status in {"approved", "pending"}:
                    desired_status = "rejected"
                else:
                    desired_status = membership.join_status

                if membership.join_status != desired_status:
                    membership.join_status = desired_status
                    changed = True

            if db.query(Wallet).filter(Wallet.user_id == user_record.id).first() is None:
                db.add(Wallet(user_id=user_record.id, balance=0.0))
                changed = True

        valid_types = {"top_up", "contribution", "savings", "loan", "loan_repayment"}
        for txn in db.query(Transaction).all():
            original_type = (txn.type or "").strip().lower()
            description = (txn.description or "").lower()

            if original_type == "deposit":
                normalized_type = "loan_repayment" if "repay" in description else "savings"
            elif original_type == "withdrawal" and "loan" in description:
                normalized_type = "loan"
            elif original_type == "contribution":
                normalized_type = "savings"
            elif original_type in valid_types:
                normalized_type = original_type
            elif txn.group_id == 0:
                normalized_type = "top_up"
            else:
                normalized_type = original_type

            if txn.type != normalized_type:
                txn.type = normalized_type
                changed = True

        if changed:
            db.commit()
            print("MicroSave legacy data normalized.")
    except Exception as exc:
        db.rollback()
        print(f"Normalization error: {exc}")
    finally:
        db.close()


def schema_ready() -> bool:
    required_tables = {
        "users",
        "groups",
        "group_members",
        "loans",
        "messages",
        "transactions",
        "wallets",
        "paystack_payments",
    }
    existing_tables = set(inspect(engine).get_table_names())
    return required_tables.issubset(existing_tables)


if schema_ready():
    seed_database()
    normalize_legacy_data()
else:
    print("MicroSave schema is not ready. Run `alembic upgrade head` before starting the API.")


@app.get("/")
def root():
    return {"message": "MicroSave API is running", "docs": "/docs"}

