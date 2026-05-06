import uuid
from datetime import datetime
from typing import Optional
from decimal import Decimal
from sqlalchemy import String, Numeric, Text, DateTime, func, text, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"

MOVEMENT_TYPES = (
    "purchase_in", "sale_out", "return_in",
    "adjustment_in", "adjustment_out", "consignment_return_out"
)


class StockMovement(Base):
    __tablename__ = "stock_movements"
    __table_args__ = (
        Index("idx_stock_movements_product", "product_id", "created_at"),
        Index("idx_stock_movements_ref", "reference_type", "reference_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id"), nullable=False
    )
    movement_type: Mapped[str] = mapped_column(String(30), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    reference_type: Mapped[Optional[str]] = mapped_column(String(30))
    reference_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    unit_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    notes: Mapped[Optional[str]] = mapped_column(Text)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id")
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False,
        server_default=text(f"'{TENANT_DEFAULT}'::uuid")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
