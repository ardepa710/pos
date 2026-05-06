from __future__ import annotations

# Module named return_ (trailing underscore) to avoid collision with Python keyword `return`.

import uuid
from datetime import datetime

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


class Return(Base):
    __tablename__ = "returns"
    __table_args__ = (
        CheckConstraint(
            "refund_method IN ('cash','gift_card','store_credit')",
            name="chk_returns_refund_method",
        ),
        Index("idx_returns_original_sale", "original_sale_id"),
        Index("idx_returns_folio", "folio", unique=True),
        Index("idx_returns_processed_by", "processed_by_user_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        server_default=text(f"'{TENANT_DEFAULT}'::uuid"),
    )
    original_sale_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="RESTRICT"),
        nullable=False,
    )
    # Human-readable folio, e.g. DEV-202605-000001
    folio: Mapped[str] = mapped_column(String(30), nullable=False, unique=True)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    total_returned_mxn: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    refund_method: Mapped[str] = mapped_column(String(20), nullable=False)
    # DEFERRABLE so return and gift_card can be created in same transaction
    generated_gift_card_id: Mapped[uuid.UUID | None] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey(
            "gift_cards.id",
            ondelete="RESTRICT",
            deferrable=True,
            initially="DEFERRED",
        ),
        nullable=True,
    )
    processed_by_user_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )


class ReturnItem(Base):
    __tablename__ = "return_items"
    __table_args__ = (
        Index("idx_return_items_return", "return_id"),
        Index("idx_return_items_original_sale_item", "original_sale_item_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        server_default=text(f"'{TENANT_DEFAULT}'::uuid"),
    )
    return_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("returns.id", ondelete="RESTRICT"),
        nullable=False,
    )
    original_sale_item_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("sale_items.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity_returned: Mapped[float] = mapped_column(Numeric(14, 3), nullable=False)
    unit_price_mxn: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    subtotal_mxn: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    # Append-only — no updated_at
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
