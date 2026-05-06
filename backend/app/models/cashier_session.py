import uuid
from datetime import datetime
from typing import Optional
from decimal import Decimal
from sqlalchemy import String, Numeric, Text, DateTime, func, text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


class CashierSession(Base):
    __tablename__ = "cashier_sessions"
    __table_args__ = (
        Index("idx_cashier_sessions_user", "cashier_id", "opened_at"),
        Index("idx_cashier_sessions_open", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cashier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="open"
    )  # open | closed
    starting_cash_mxn: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    expected_cash_mxn: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    physical_cash_mxn: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    difference_mxn: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    total_sales_mxn: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    total_cash_payments: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    total_card_payments: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    total_gift_card_payments: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    notes_open: Mapped[Optional[str]] = mapped_column(Text)
    notes_close: Mapped[Optional[str]] = mapped_column(Text)
    opened_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    closed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False,
        server_default=text(f"'{TENANT_DEFAULT}'::uuid")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now()
    )
