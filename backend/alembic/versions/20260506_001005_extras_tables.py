"""extras tables: exchange_rates, gift_cards, gift_card_transactions, returns, return_items

Revision ID: 20260506001005
Revises: 20260506001004
Create Date: 2026-05-06 10:10:05.000000
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "20260506001005"
down_revision: str | None = "20260506001004"
branch_labels: str | tuple[str, ...] | None = None
depends_on: str | tuple[str, ...] | None = None

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. exchange_rates — no FK dependencies on new tables
    # ------------------------------------------------------------------
    op.create_table(
        "exchange_rates",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid"),
        ),
        sa.Column("pair", sa.String(10), nullable=False),
        sa.Column("rate", sa.Numeric(14, 6), nullable=False),
        sa.Column("source", sa.String(50), nullable=False, server_default="banxico"),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.UniqueConstraint(
            "tenant_id",
            "date",
            "pair",
            name="uq_exchange_rates_tenant_date_pair",
        ),
    )
    op.create_index("idx_exchange_rates_pair_date", "exchange_rates", ["pair", "date"])
    op.create_index(
        "idx_exchange_rates_tenant_date", "exchange_rates", ["tenant_id", "date"]
    )

    # ------------------------------------------------------------------
    # 2. gift_cards — issued_by_sale_id FK to existing sales table (DEFERRABLE)
    # ------------------------------------------------------------------
    op.create_table(
        "gift_cards",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid"),
        ),
        sa.Column("code", sa.String(64), nullable=False),
        sa.Column("initial_balance", sa.Numeric(14, 4), nullable=False),
        sa.Column("current_balance", sa.Numeric(14, 4), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False, server_default="MXN"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column(
            "issued_by_sale_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "sales.id",
                ondelete="RESTRICT",
                deferrable=True,
                initially="DEFERRED",
            ),
            nullable=True,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
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
        sa.UniqueConstraint("code", name="uq_gift_cards_code"),
        sa.CheckConstraint(
            "status IN ('active','redeemed','expired','voided')",
            name="chk_gift_cards_status",
        ),
    )
    op.create_index("idx_gift_cards_code", "gift_cards", ["code"], unique=True)
    op.create_index(
        "idx_gift_cards_tenant_status", "gift_cards", ["tenant_id", "status"]
    )

    # ------------------------------------------------------------------
    # 3. gift_card_transactions — FKs to gift_cards, sales, users
    # ------------------------------------------------------------------
    op.create_table(
        "gift_card_transactions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid"),
        ),
        sa.Column(
            "gift_card_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("gift_cards.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("transaction_type", sa.String(20), nullable=False),
        sa.Column("amount", sa.Numeric(14, 4), nullable=False),
        sa.Column("balance_after", sa.Numeric(14, 4), nullable=False),
        sa.Column(
            "sale_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sales.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column(
            "performed_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=True,
        ),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint(
            "transaction_type IN ('issue','redeem','void','refund_credit')",
            name="chk_gct_type",
        ),
    )
    op.create_index(
        "idx_gct_gift_card", "gift_card_transactions", ["gift_card_id", "created_at"]
    )
    op.create_index("idx_gct_sale", "gift_card_transactions", ["sale_id"])

    # ------------------------------------------------------------------
    # 4. returns — FKs to sales, users; generated_gift_card_id DEFERRABLE
    # ------------------------------------------------------------------
    op.create_table(
        "returns",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid"),
        ),
        sa.Column(
            "original_sale_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sales.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("folio", sa.String(30), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("total_returned_mxn", sa.Numeric(14, 4), nullable=False),
        sa.Column("refund_method", sa.String(20), nullable=False),
        sa.Column(
            "generated_gift_card_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey(
                "gift_cards.id",
                ondelete="RESTRICT",
                deferrable=True,
                initially="DEFERRED",
            ),
            nullable=True,
        ),
        sa.Column(
            "processed_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="RESTRICT"),
            nullable=False,
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
        sa.UniqueConstraint("folio", name="uq_returns_folio"),
        sa.CheckConstraint(
            "refund_method IN ('cash','gift_card','store_credit')",
            name="chk_returns_refund_method",
        ),
    )
    op.create_index("idx_returns_original_sale", "returns", ["original_sale_id"])
    op.create_index("idx_returns_folio", "returns", ["folio"], unique=True)
    op.create_index(
        "idx_returns_processed_by", "returns", ["processed_by_user_id", "created_at"]
    )

    # ------------------------------------------------------------------
    # 5. return_items — FKs to returns, sale_items
    # ------------------------------------------------------------------
    op.create_table(
        "return_items",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "tenant_id",
            postgresql.UUID(as_uuid=True),
            nullable=False,
            server_default=sa.text(f"'{TENANT_DEFAULT}'::uuid"),
        ),
        sa.Column(
            "return_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("returns.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column(
            "original_sale_item_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("sale_items.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("quantity_returned", sa.Numeric(14, 3), nullable=False),
        sa.Column("unit_price_mxn", sa.Numeric(14, 4), nullable=False),
        sa.Column("subtotal_mxn", sa.Numeric(14, 4), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("NOW()"),
        ),
        sa.CheckConstraint("quantity_returned > 0", name="chk_return_items_qty"),
    )
    op.create_index("idx_return_items_return", "return_items", ["return_id"])
    op.create_index(
        "idx_return_items_original_sale_item",
        "return_items",
        ["original_sale_item_id"],
    )


def downgrade() -> None:
    # Drop in reverse dependency order
    op.drop_table("return_items")
    op.drop_table("returns")
    op.drop_table("gift_card_transactions")
    op.drop_table("gift_cards")
    op.drop_table("exchange_rates")
