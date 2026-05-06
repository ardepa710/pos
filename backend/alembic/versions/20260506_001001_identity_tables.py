"""identity tables: users, business_settings, audit_logs, cashier_sessions, loyalty

Revision ID: 20260506001001
Revises:
Create Date: 2026-05-06 10:10:01.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260506001001"
down_revision: str | None = None
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("username", sa.String(50), nullable=False),
        sa.Column("email", sa.String(120), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("password_hash", sa.String(120), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.Column("theme_preference", sa.String(10), nullable=False, server_default="system"),
        sa.Column("language", sa.String(10), nullable=False, server_default="es-MX"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("must_change_password", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("last_login_at", sa.DateTime(timezone=True)),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("username", name="uq_users_username"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.CheckConstraint("role IN ('admin','supervisor','cashier')", name="chk_users_role"),
        sa.CheckConstraint("theme_preference IN ('light','dark','system')", name="chk_users_theme"),
    )

    # business_settings
    op.create_table(
        "business_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("business_name", sa.String(120), nullable=False),
        sa.Column("rfc", sa.String(20)),
        sa.Column("address", sa.Text),
        sa.Column("phone", sa.String(20)),
        sa.Column("base_currency", sa.String(3), nullable=False, server_default="MXN"),
        sa.Column("secondary_currency", sa.String(3), nullable=False, server_default="USD"),
        sa.Column("tax_rate", sa.Numeric(5, 4), nullable=False, server_default="0.16"),
        sa.Column("fx_source", sa.String(20), nullable=False, server_default="banxico"),
        sa.Column("receipt_footer", sa.Text),
        sa.Column("logo_url", sa.Text),
        sa.Column("logo_small_url", sa.Text),
        sa.Column("favicon_url", sa.Text),
        sa.Column("primary_color", sa.String(10), nullable=False, server_default="#3b82f6"),
        sa.Column("secondary_color", sa.String(10)),
        sa.Column("font_family", sa.String(80), nullable=False, server_default="Inter"),
        sa.Column("theme", sa.String(10), nullable=False, server_default="light"),
        sa.Column("business_type", sa.String(30), nullable=False, server_default="general"),
        sa.Column("wizard_completed", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("support_whatsapp", sa.String(30)),
        sa.Column("telemetry_enabled", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    # audit_logs
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("action", sa.String(60), nullable=False),
        sa.Column("entity_type", sa.String(40), nullable=False),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True)),
        sa.Column("ip_address", sa.String(45)),
        sa.Column("user_agent", sa.Text),
        sa.Column("payload", postgresql.JSONB),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("idx_audit_actor", "audit_logs", ["actor_id", "created_at"])
    op.create_index("idx_audit_entity", "audit_logs", ["entity_type", "entity_id"])
    op.create_index("idx_audit_created", "audit_logs", ["created_at"])

    # cashier_sessions
    op.create_table(
        "cashier_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("cashier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="open"),
        sa.Column("starting_cash_mxn", sa.Numeric(14, 4), nullable=False),
        sa.Column("expected_cash_mxn", sa.Numeric(14, 4)),
        sa.Column("physical_cash_mxn", sa.Numeric(14, 4)),
        sa.Column("difference_mxn", sa.Numeric(14, 4)),
        sa.Column("total_sales_mxn", sa.Numeric(14, 4)),
        sa.Column("total_cash_payments", sa.Numeric(14, 4)),
        sa.Column("total_card_payments", sa.Numeric(14, 4)),
        sa.Column("total_gift_card_payments", sa.Numeric(14, 4)),
        sa.Column("notes_open", sa.Text),
        sa.Column("notes_close", sa.Text),
        sa.Column("opened_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("closed_at", sa.DateTime(timezone=True)),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("status IN ('open','closed')", name="chk_cashier_sessions_status"),
    )
    op.create_index("idx_cashier_sessions_user", "cashier_sessions", ["cashier_id", "opened_at"])
    op.create_index("idx_cashier_sessions_open", "cashier_sessions", ["status"])

    # loyalty_accounts (customers table referenced — created in A1-Models-People migration)
    # NOTE: FK to customers added in A1-Models-People migration via alter table
    op.create_table(
        "loyalty_accounts",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=False, unique=True),
        sa.Column("points_balance", sa.Integer, nullable=False, server_default="0"),
        sa.Column("lifetime_points", sa.Integer, nullable=False, server_default="0"),
        sa.Column("last_activity_at", sa.DateTime(timezone=True)),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )

    # loyalty_transactions
    op.create_table(
        "loyalty_transactions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("loyalty_accounts.id"), nullable=False),
        sa.Column("transaction_type", sa.String(20), nullable=False),
        sa.Column("points", sa.Integer, nullable=False),
        sa.Column("balance_after", sa.Integer, nullable=False),
        sa.Column("reference_type", sa.String(30)),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True)),
        sa.Column("notes", sa.Text),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("transaction_type IN ('earn','redeem','expire','adjust')", name="chk_loyalty_tx_type"),
    )
    op.create_index("idx_loyalty_tx_account", "loyalty_transactions", ["account_id", "created_at"])


def downgrade() -> None:
    op.drop_table("loyalty_transactions")
    op.drop_table("loyalty_accounts")
    op.drop_index("idx_cashier_sessions_open", "cashier_sessions")
    op.drop_index("idx_cashier_sessions_user", "cashier_sessions")
    op.drop_table("cashier_sessions")
    op.drop_index("idx_audit_created", "audit_logs")
    op.drop_index("idx_audit_entity", "audit_logs")
    op.drop_index("idx_audit_actor", "audit_logs")
    op.drop_table("audit_logs")
    op.drop_table("business_settings")
    op.drop_table("users")
