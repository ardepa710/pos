import uuid
from datetime import datetime
from typing import Optional
from decimal import Decimal
from sqlalchemy import String, Numeric, Text, DateTime, func, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


class BusinessSettings(Base):
    __tablename__ = "business_settings"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_name: Mapped[str] = mapped_column(String(120), nullable=False)
    rfc: Mapped[Optional[str]] = mapped_column(String(20))
    address: Mapped[Optional[str]] = mapped_column(Text)
    phone: Mapped[Optional[str]] = mapped_column(String(20))
    base_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="MXN")
    secondary_currency: Mapped[str] = mapped_column(String(3), nullable=False, default="USD")
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False, default=Decimal("0.16"))
    fx_source: Mapped[str] = mapped_column(String(20), nullable=False, default="banxico")
    receipt_footer: Mapped[Optional[str]] = mapped_column(Text)
    logo_url: Mapped[Optional[str]] = mapped_column(Text)
    logo_small_url: Mapped[Optional[str]] = mapped_column(Text)
    favicon_url: Mapped[Optional[str]] = mapped_column(Text)
    primary_color: Mapped[str] = mapped_column(String(10), nullable=False, default="#3b82f6")
    secondary_color: Mapped[Optional[str]] = mapped_column(String(10))
    font_family: Mapped[str] = mapped_column(String(80), nullable=False, default="Inter")
    theme: Mapped[str] = mapped_column(String(10), nullable=False, default="light")
    business_type: Mapped[str] = mapped_column(String(30), nullable=False, default="general")
    wizard_completed: Mapped[bool] = mapped_column(nullable=False, default=False)
    support_whatsapp: Mapped[Optional[str]] = mapped_column(String(30))
    telemetry_enabled: Mapped[bool] = mapped_column(nullable=False, default=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False,
        server_default=text(f"'{TENANT_DEFAULT}'::uuid")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now()
    )
