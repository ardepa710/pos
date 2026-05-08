import uuid
from datetime import datetime
from typing import Optional, Any
from decimal import Decimal
from sqlalchemy import String, Numeric, Text, Boolean, DateTime, func, text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


class Product(Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("tenant_id", "sku", name="uq_products_tenant_sku"),
        Index("idx_products_category", "category_id"),
        Index("idx_products_barcode", "barcode"),
        Index("idx_products_active", "is_active"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sku: Mapped[str] = mapped_column(String(40), nullable=False)
    barcode: Mapped[Optional[str]] = mapped_column(String(40))
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True), ForeignKey("categories.id")
    )
    # Pricing tiers (MXN)
    price_general: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    price_a: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    price_b: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    price_c: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    # Cost tracking
    last_cost: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    last_cost_updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    # Inventory
    track_inventory: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    stock_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False, default=Decimal("0"))
    reorder_point: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 3))
    unit_of_measure: Mapped[str] = mapped_column(String(20), nullable=False, default="pza")
    # Consignment
    is_consigned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    consigned_supplier_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    # Dynamic attributes per business type (e.g. size, color for clothing)
    attributes: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, default=dict)
    # Display
    thumbnail_url: Mapped[Optional[str]] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False,
        server_default=text(f"'{TENANT_DEFAULT}'::uuid")
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
