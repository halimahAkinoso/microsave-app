"""Bootstrap current schema and migrate savings columns.

Revision ID: 20260323_000001
Revises:
Create Date: 2026-03-23 17:05:00
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260323_000001"
down_revision = None
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    return table_name in sa.inspect(bind).get_table_names()


def _has_column(bind, table_name: str, column_name: str) -> bool:
    return column_name in {column["name"] for column in sa.inspect(bind).get_columns(table_name)}


def _rename_column(table_name: str, old_name: str, new_name: str) -> None:
    op.execute(sa.text(f"ALTER TABLE {table_name} RENAME COLUMN {old_name} TO {new_name}"))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "users"):
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("password", sa.String(), nullable=False),
            sa.Column("phone", sa.String(), nullable=True),
            sa.Column("occupation", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        )
        op.create_index("ix_users_id", "users", ["id"], unique=False)
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    if not _has_table(bind, "groups"):
        op.create_table(
            "groups",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("name", sa.String(), nullable=False),
            sa.Column("description", sa.String(), nullable=True),
            sa.Column("balance", sa.Float(), server_default=sa.text("0"), nullable=True),
            sa.Column("savings_amount", sa.Float(), server_default=sa.text("0"), nullable=True),
            sa.Column("savings_period", sa.String(), server_default=sa.text("'monthly'"), nullable=True),
            sa.Column("admin_id", sa.Integer(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        )
        op.create_index("ix_groups_id", "groups", ["id"], unique=False)
    else:
        if _has_column(bind, "groups", "contribution_amount") and not _has_column(bind, "groups", "savings_amount"):
            _rename_column("groups", "contribution_amount", "savings_amount")
        if _has_column(bind, "groups", "contribution_period") and not _has_column(bind, "groups", "savings_period"):
            _rename_column("groups", "contribution_period", "savings_period")
        if not _has_column(bind, "groups", "savings_amount"):
            with op.batch_alter_table("groups") as batch_op:
                batch_op.add_column(sa.Column("savings_amount", sa.Float(), server_default=sa.text("0"), nullable=True))
        if not _has_column(bind, "groups", "savings_period"):
            with op.batch_alter_table("groups") as batch_op:
                batch_op.add_column(sa.Column("savings_period", sa.String(), server_default=sa.text("'monthly'"), nullable=True))

    if not _has_table(bind, "group_members"):
        op.create_table(
            "group_members",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("group_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(), server_default=sa.text("'member'"), nullable=True),
            sa.Column("join_status", sa.String(), server_default=sa.text("'pending'"), nullable=True),
            sa.Column("joined_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        )
        op.create_index("ix_group_members_id", "group_members", ["id"], unique=False)

    if not _has_table(bind, "loans"):
        op.create_table(
            "loans",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("group_id", sa.Integer(), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("amount_repaid", sa.Float(), server_default=sa.text("0"), nullable=True),
            sa.Column("purpose", sa.String(), nullable=True),
            sa.Column("status", sa.String(), server_default=sa.text("'pending'"), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        )
        op.create_index("ix_loans_id", "loans", ["id"], unique=False)

    if not _has_table(bind, "messages"):
        op.create_table(
            "messages",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("sender_id", sa.Integer(), nullable=False),
            sa.Column("group_id", sa.Integer(), nullable=False),
            sa.Column("content", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        )
        op.create_index("ix_messages_id", "messages", ["id"], unique=False)

    if not _has_table(bind, "transactions"):
        op.create_table(
            "transactions",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("group_id", sa.Integer(), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("type", sa.String(), nullable=False),
            sa.Column("description", sa.String(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        )
        op.create_index("ix_transactions_id", "transactions", ["id"], unique=False)

    if not _has_table(bind, "wallets"):
        op.create_table(
            "wallets",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("balance", sa.Float(), server_default=sa.text("0"), nullable=True),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        )
        op.create_index("ix_wallets_id", "wallets", ["id"], unique=False)
        op.create_index("ix_wallets_user_id", "wallets", ["user_id"], unique=True)

    if not _has_table(bind, "paystack_payments"):
        op.create_table(
            "paystack_payments",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("reference", sa.String(), nullable=False),
            sa.Column("amount", sa.Float(), nullable=False),
            sa.Column("currency", sa.String(), server_default=sa.text("'NGN'"), nullable=True),
            sa.Column("payment_method", sa.String(), server_default=sa.text("'bank_transfer'"), nullable=False),
            sa.Column("status", sa.String(), server_default=sa.text("'pending'"), nullable=False),
            sa.Column("authorization_url", sa.String(), nullable=True),
            sa.Column("access_code", sa.String(), nullable=True),
            sa.Column("callback_url", sa.String(), nullable=True),
            sa.Column("paystack_transaction_id", sa.String(), nullable=True),
            sa.Column("channel", sa.String(), nullable=True),
            sa.Column("gateway_response", sa.String(), nullable=True),
            sa.Column("verified_at", sa.DateTime(), nullable=True),
            sa.Column("created_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
            sa.Column("updated_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=True),
        )
        op.create_index("ix_paystack_payments_id", "paystack_payments", ["id"], unique=False)
        op.create_index("ix_paystack_payments_reference", "paystack_payments", ["reference"], unique=True)
        op.create_index("ix_paystack_payments_user_id", "paystack_payments", ["user_id"], unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, "groups"):
        if _has_column(bind, "groups", "savings_amount") and not _has_column(bind, "groups", "contribution_amount"):
            _rename_column("groups", "savings_amount", "contribution_amount")
        if _has_column(bind, "groups", "savings_period") and not _has_column(bind, "groups", "contribution_period"):
            _rename_column("groups", "savings_period", "contribution_period")
