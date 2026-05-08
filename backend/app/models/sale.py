import uuid
from datetime import datetime, date
from typing import Optional
from decimal import Decimal
from sqlalchemy import String, Numeric, Text, Boolean, DateTime, Date, func, text, ForeignKey, UniqueConstraint, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"

class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        UniqueConstraint("tenant_id", "folio", name="uq_sales_tenant_folio"),
        Index("idx_sales_date", "created_at"),
        Index("idx_sales_customer", "customer_id"),
        Index("idx_sales_cashier", "cashier_id", "created_at"),
        Index("idx_sales_status", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    folio: Mapped[str] = mapped_column(String(20), nullable=False)
    customer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    cashier_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    cashier_session_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("cashier_sessions.id"))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="completed")
    subtotal_mxn: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    tax_mxn: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=Decimal("0"))
    discount_mxn: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=Decimal("0"))
    total_mxn: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    total_usd: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    fx_rate_used: Mapped[Decimal] = mapped_column(Numeric(14, 6), nullable=False)
    fx_rate_date: Mapped[date] = mapped_column(Date, nullable=False)
    cancelled_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancel_reason: Mapped[Optional[str]] = mapped_column(Text)
    notes: Mapped[Optional[str]] = mapped_column(Text)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, server_default=text(f"'{TENANT_DEFAULT}'::uuid"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class SaleItem(Base):
    __tablename__ = "sale_items"
    __table_args__ = (
        Index("idx_sale_items_sale", "sale_id"),
        Index("idx_sale_items_product", "product_id", "created_at"),
        Index("idx_sale_items_consign", "consigned_supplier_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    product_name_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)
    product_sku_snapshot: Mapped[str] = mapped_column(String(40), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    unit_price_mxn: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    unit_cost_snapshot: Mapped[Optional[Decimal]] = mapped_column(Numeric(14, 4))
    price_tier_used: Mapped[str] = mapped_column(String(10), nullable=False, default="general")
    discount_mxn: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False, default=Decimal("0"))
    subtotal_mxn: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    was_consigned: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    consigned_supplier_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("suppliers.id"))
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, server_default=text(f"'{TENANT_DEFAULT}'::uuid"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        Index("idx_payments_sale", "sale_id"),
        Index("idx_payments_method", "method", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sale_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sales.id", ondelete="CASCADE"), nullable=False)
    method: Mapped[str] = mapped_column(String(20), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="MXN")
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    amount_in_mxn: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    fx_rate_used: Mapped[Decimal] = mapped_column(Numeric(14, 6), nullable=False, default=Decimal("1"))
    gift_card_id: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True))
    terminal_reference: Mapped[Optional[str]] = mapped_column(String(120))
    card_last4: Mapped[Optional[str]] = mapped_column(String(4))
    reference: Mapped[Optional[str]] = mapped_column(String(120))
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, server_default=text(f"'{TENANT_DEFAULT}'::uuid"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
