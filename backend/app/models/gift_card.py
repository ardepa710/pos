from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    Index,
    Numeric,
    String,
    Text,
    func,
    text,
    ForeignKey,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


class GiftCard(Base):
    __tablename__ = "gift_cards"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active','redeemed','expired','voided')",
            name="chk_gift_cards_status",
        ),
        Index("idx_gift_cards_code", "code", unique=True),
        Index("idx_gift_cards_tenant_status", "tenant_id", "status"),
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
    # HMAC-signed QR payload — generated server-side
    code: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    initial_balance: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    current_balance: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default="MXN"
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="active"
    )
    # DEFERRABLE so sale and gift_card can be created in same transaction
    issued_by_sale_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="RESTRICT", deferrable=True, initially="DEFERRED"),
        nullable=True,
    )
    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
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


class GiftCardTransaction(Base):
    __tablename__ = "gift_card_transactions"
    __table_args__ = (
        CheckConstraint(
            "transaction_type IN ('issue','redeem','void','refund_credit')",
            name="chk_gct_type",
        ),
        Index("idx_gct_gift_card", "gift_card_id", "created_at"),
        Index("idx_gct_sale", "sale_id"),
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
    gift_card_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("gift_cards.id", ondelete="RESTRICT"),
        nullable=False,
    )
    transaction_type: Mapped[str] = mapped_column(String(20), nullable=False)
    # positive = credit, negative = debit
    amount: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    balance_after: Mapped[float] = mapped_column(Numeric(14, 4), nullable=False)
    sale_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="RESTRICT"),
        nullable=True,
    )
    performed_by_user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        PG_UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Append-only ledger — no updated_at
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
