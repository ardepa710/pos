"""catalog tables: categories, products, stock_movements

Revision ID: 20260506001002
Revises: 20260506001001
Create Date: 2026-05-06 10:10:02.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260506001002"
down_revision: str | None = "20260506001001"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    # Enable pg_trgm for name search
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")

    # categories
    op.create_table(
        "categories",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id")),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("tenant_id", "name", "parent_id", name="uq_categories_tenant_name_parent"),
    )
    op.create_index("idx_categories_parent", "categories", ["parent_id"], postgresql_where=sa.text("deleted_at IS NULL"))

    # products
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("sku", sa.String(40), nullable=False),
        sa.Column("barcode", sa.String(40)),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id")),
        sa.Column("price_general", sa.Numeric(14, 4), nullable=False),
        sa.Column("price_a", sa.Numeric(14, 4)),
        sa.Column("price_b", sa.Numeric(14, 4)),
        sa.Column("price_c", sa.Numeric(14, 4)),
        sa.Column("last_cost", sa.Numeric(14, 4)),
        sa.Column("last_cost_updated_at", sa.DateTime(timezone=True)),
        sa.Column("track_inventory", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("stock_quantity", sa.Numeric(14, 3), nullable=False, server_default="0"),
        sa.Column("reorder_point", sa.Numeric(14, 3)),
        sa.Column("unit_of_measure", sa.String(20), nullable=False, server_default="pza"),
        sa.Column("is_consigned", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("consigned_supplier_id", postgresql.UUID(as_uuid=True)),
        sa.Column("attributes", postgresql.JSONB, server_default="{}"),
        sa.Column("thumbnail_url", sa.Text),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("tenant_id", "sku", name="uq_products_tenant_sku"),
        sa.CheckConstraint("price_general >= 0", name="chk_products_price"),
    )
    op.create_index("idx_products_category", "products", ["category_id"], postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_products_barcode", "products", ["barcode"], postgresql_where=sa.text("deleted_at IS NULL"))
    op.create_index("idx_products_active", "products", ["is_active"], postgresql_where=sa.text("deleted_at IS NULL"))
    op.execute("CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops)")

    # stock_movements
    op.create_table(
        "stock_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("movement_type", sa.String(30), nullable=False),
        sa.Column("quantity", sa.Numeric(14, 3), nullable=False),
        sa.Column("reference_type", sa.String(30)),
        sa.Column("reference_id", postgresql.UUID(as_uuid=True)),
        sa.Column("unit_cost", sa.Numeric(14, 4)),
        sa.Column("notes", sa.Text),
        sa.Column("actor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id")),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
        sa.CheckConstraint(
            "movement_type IN ('purchase_in','sale_out','return_in','adjustment_in','adjustment_out','consignment_return_out')",
            name="chk_stock_movement_type"
        ),
    )
    op.create_index("idx_stock_movements_product", "stock_movements", ["product_id", "created_at"])
    op.create_index("idx_stock_movements_ref", "stock_movements", ["reference_type", "reference_id"])


def downgrade() -> None:
    op.drop_table("stock_movements")
    op.execute("DROP INDEX IF EXISTS idx_products_name_trgm")
    op.drop_table("products")
    op.drop_table("categories")
