"""operations tables: purchases, purchase_items, consignment_settlements, sales, sale_items, payments

Revision ID: 20260506001004
Revises: 20260506001003
Create Date: 2026-05-06 10:10:04.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260506001004"
down_revision: str | None = "20260506001003"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    # purchases
    op.create_table(
        "purchases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("folio", sa.String(20), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("purchase_type", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("subtotal", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("tax", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("total", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(3), nullable=False, server_default="MXN"),
        sa.Column("exchange_rate", sa.Numeric(14, 6)),
        sa.Column("notes", sa.Text),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("cancelled_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("cancelled_at", sa.DateTime(timezone=True)),
        sa.Column("cancel_reason", sa.Text),
        sa.Column("consignment_period_start", sa.Date),
        sa.Column("consignment_period_end", sa.Date),
        sa.Column("consignment_settled", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("consignment_settlement_id", postgresql.UUID(as_uuid=True)),
        sa.Column("received_at", sa.DateTime(timezone=True)),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("tenant_id", "folio", name="uq_purchases_tenant_folio"),
        sa.CheckConstraint("purchase_type IN ('normal','consignment')", name="chk_purchases_type"),
        sa.CheckConstraint("status IN ('draft','pending','approved','cancelled')", name="chk_purchases_status"),
    )
    op.create_index("idx_purchases_supplier", "purchases", ["supplier_id", "created_at"])
    op.create_index("idx_purchases_status", "purchases", ["status"], postgresql_where=sa.text("deleted_at IS NULL"))

    # purchase_items
    op.create_table(
        "purchase_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("purchase_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("purchases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Numeric(14, 3), nullable=False),
        sa.Column("unit_cost", sa.Numeric(14, 4), nullable=False),
        sa.Column("subtotal", sa.Numeric(14, 4), nullable=False),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("quantity > 0", name="chk_purchase_items_qty"),
        sa.CheckConstraint("unit_cost >= 0", name="chk_purchase_items_cost"),
    )
    op.create_index("idx_purchase_items_purchase", "purchase_items", ["purchase_id"])
    op.create_index("idx_purchase_items_product", "purchase_items", ["product_id"])

    # consignment_settlements
    op.create_table(
        "consignment_settlements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("folio", sa.String(20), nullable=False),
        sa.Column("supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id"), nullable=False),
        sa.Column("period_start", sa.Date, nullable=False),
        sa.Column("period_end", sa.Date, nullable=False),
        sa.Column("gross_sales", sa.Numeric(14, 4), nullable=False),
        sa.Column("commission_pct", sa.Numeric(5, 4), nullable=False),
        sa.Column("commission_amount", sa.Numeric(14, 4), nullable=False),
        sa.Column("payable_to_supplier", sa.Numeric(14, 4), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="draft"),
        sa.Column("approved_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("approved_at", sa.DateTime(timezone=True)),
        sa.Column("paid_at", sa.DateTime(timezone=True)),
        sa.Column("payment_reference", sa.String(120)),
        sa.Column("notes", sa.Text),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("tenant_id", "folio", name="uq_consignment_settlements_folio"),
        sa.CheckConstraint("status IN ('draft','approved','paid','cancelled')", name="chk_settlements_status"),
    )

    # sales
    op.create_table(
        "sales",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("folio", sa.String(20), nullable=False),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("customers.id"), nullable=False),
        sa.Column("cashier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("cashier_session_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cashier_sessions.id")),
        sa.Column("status", sa.String(20), nullable=False, server_default="completed"),
        sa.Column("subtotal_mxn", sa.Numeric(14, 4), nullable=False),
        sa.Column("tax_mxn", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("discount_mxn", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("total_mxn", sa.Numeric(14, 4), nullable=False),
        sa.Column("total_usd", sa.Numeric(14, 4), nullable=False),
        sa.Column("fx_rate_used", sa.Numeric(14, 6), nullable=False),
        sa.Column("fx_rate_date", sa.Date, nullable=False),
        sa.Column("cancelled_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("cancelled_at", sa.DateTime(timezone=True)),
        sa.Column("cancel_reason", sa.Text),
        sa.Column("notes", sa.Text),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.UniqueConstraint("tenant_id", "folio", name="uq_sales_tenant_folio"),
        sa.CheckConstraint("status IN ('completed','cancelled','refunded','partially_refunded')", name="chk_sales_status"),
    )
    op.create_index("idx_sales_date", "sales", ["created_at"])
    op.create_index("idx_sales_customer", "sales", ["customer_id"])
    op.create_index("idx_sales_cashier", "sales", ["cashier_id", "created_at"])
    op.create_index("idx_sales_status", "sales", ["status"])

    # sale_items
    op.create_table(
        "sale_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sale_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("product_name_snapshot", sa.String(200), nullable=False),
        sa.Column("product_sku_snapshot", sa.String(40), nullable=False),
        sa.Column("quantity", sa.Numeric(14, 3), nullable=False),
        sa.Column("unit_price_mxn", sa.Numeric(14, 4), nullable=False),
        sa.Column("unit_cost_snapshot", sa.Numeric(14, 4)),
        sa.Column("price_tier_used", sa.String(10), nullable=False, server_default="general"),
        sa.Column("discount_mxn", sa.Numeric(14, 4), nullable=False, server_default="0"),
        sa.Column("subtotal_mxn", sa.Numeric(14, 4), nullable=False),
        sa.Column("was_consigned", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("consigned_supplier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("suppliers.id")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("quantity > 0", name="chk_sale_items_qty"),
    )
    op.create_index("idx_sale_items_sale", "sale_items", ["sale_id"])
    op.create_index("idx_sale_items_product", "sale_items", ["product_id", "created_at"])
    op.create_index("idx_sale_items_consign", "sale_items", ["consigned_supplier_id", "created_at"], postgresql_where=sa.text("was_consigned = TRUE"))

    # payments
    op.create_table(
        "payments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sale_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("sales.id", ondelete="CASCADE"), nullable=False),
        sa.Column("method", sa.String(20), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="MXN"),
        sa.Column("amount", sa.Numeric(14, 4), nullable=False),
        sa.Column("amount_in_mxn", sa.Numeric(14, 4), nullable=False),
        sa.Column("fx_rate_used", sa.Numeric(14, 6), nullable=False, server_default="1"),
        sa.Column("gift_card_id", postgresql.UUID(as_uuid=True)),
        sa.Column("terminal_reference", sa.String(120)),
        sa.Column("card_last4", sa.String(4)),
        sa.Column("reference", sa.String(120)),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint("method IN ('cash','credit_card','debit_card','gift_card','transfer','other')", name="chk_payments_method"),
        sa.CheckConstraint("amount > 0", name="chk_payments_amount"),
        sa.CheckConstraint(
            "method NOT IN ('credit_card','debit_card') OR terminal_reference IS NOT NULL",
            name="chk_payments_card_reference"
        ),
    )
    op.create_index("idx_payments_sale", "payments", ["sale_id"])
    op.create_index("idx_payments_method", "payments", ["method", "created_at"])


def downgrade() -> None:
    op.drop_table("payments")
    op.drop_table("sale_items")
    op.drop_table("sales")
    op.drop_table("consignment_settlements")
    op.drop_table("purchase_items")
    op.drop_table("purchases")
