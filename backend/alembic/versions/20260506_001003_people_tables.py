"""people tables: customers, suppliers + loyalty FK

Revision ID: 20260506001003
Revises: 20260506001002
Create Date: 2026-05-06 10:10:03.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260506001003"
down_revision: str | None = "20260506001002"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    # customers
    op.create_table(
        "customers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("full_name", sa.String(150), nullable=False),
        sa.Column("email", sa.String(150)),
        sa.Column("phone", sa.String(30)),
        sa.Column("rfc", sa.String(20)),
        sa.Column("address", sa.Text),
        sa.Column("price_tier", sa.String(10), nullable=False, server_default="general"),
        sa.Column("is_default", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("notes", sa.Text),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("tenant_id", "code", name="uq_customers_tenant_code"),
        sa.CheckConstraint(
            "price_tier IN ('general','a','b','c')",
            name="chk_customers_price_tier",
        ),
    )
    op.create_index(
        "idx_customers_default",
        "customers",
        ["tenant_id"],
        unique=True,
        postgresql_where=sa.text("is_default = TRUE"),
    )

    # suppliers
    op.create_table(
        "suppliers",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column("code", sa.String(20), nullable=False),
        sa.Column("legal_name", sa.String(200), nullable=False),
        sa.Column("contact_name", sa.String(150)),
        sa.Column("email", sa.String(150)),
        sa.Column("phone", sa.String(30)),
        sa.Column("rfc", sa.String(20)),
        sa.Column("address", sa.Text),
        sa.Column("supplier_type", sa.String(20), nullable=False, server_default="normal"),
        sa.Column("consignment_period_days", sa.Integer),
        sa.Column("consignment_commission_pct", sa.Numeric(5, 4)),
        sa.Column("payment_terms_days", sa.Integer, nullable=False, server_default="0"),
        sa.Column("notes", sa.Text),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("tenant_id", "code", name="uq_suppliers_tenant_code"),
        sa.CheckConstraint(
            "supplier_type IN ('normal','consignment','both')",
            name="chk_suppliers_type",
        ),
        sa.CheckConstraint(
            "supplier_type = 'normal' OR "
            "(consignment_period_days IS NOT NULL AND consignment_commission_pct IS NOT NULL)",
            name="chk_suppliers_consignment_fields",
        ),
    )

    # Add FK from loyalty_accounts to customers (customers table now exists)
    op.create_foreign_key(
        "fk_loyalty_accounts_customer",
        "loyalty_accounts",
        "customers",
        ["customer_id"],
        ["id"],
    )

    # Add FK from products to suppliers for consigned_supplier_id
    op.create_foreign_key(
        "fk_products_consigned_supplier",
        "products",
        "suppliers",
        ["consigned_supplier_id"],
        ["id"],
    )


def downgrade() -> None:
    op.drop_constraint("fk_products_consigned_supplier", "products", type_="foreignkey")
    op.drop_constraint("fk_loyalty_accounts_customer", "loyalty_accounts", type_="foreignkey")
    op.drop_table("suppliers")
    op.drop_index("idx_customers_default", table_name="customers")
    op.drop_table("customers")
