import uuid
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field


class BusinessSettingsRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    business_name: str
    rfc: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    base_currency: str
    secondary_currency: str
    tax_rate: Decimal
    fx_source: str
    receipt_footer: Optional[str]
    logo_url: Optional[str]
    logo_small_url: Optional[str]
    favicon_url: Optional[str]
    primary_color: str
    secondary_color: Optional[str]
    font_family: str
    theme: str
    business_type: str
    wizard_completed: bool
    support_whatsapp: Optional[str]
    telemetry_enabled: bool
    updated_at: datetime


class BusinessSettingsUpdate(BaseModel):
    business_name: Optional[str] = Field(None, max_length=120)
    rfc: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    phone: Optional[str] = Field(None, max_length=20)
    tax_rate: Optional[Decimal] = Field(None, ge=Decimal("0"), le=Decimal("1"))
    fx_source: Optional[str] = Field(None, pattern="^(banxico|manual)$")
    receipt_footer: Optional[str] = None
    logo_url: Optional[str] = None
    logo_small_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = Field(None, pattern="^#[0-9a-fA-F]{6}$")
    secondary_color: Optional[str] = Field(None, pattern="^#[0-9a-fA-F]{6}$")
    font_family: Optional[str] = Field(None, max_length=80)
    theme: Optional[str] = Field(None, pattern="^(light|dark|system)$")
    business_type: Optional[str] = None
    wizard_completed: Optional[bool] = None
    support_whatsapp: Optional[str] = Field(None, max_length=30)
    telemetry_enabled: Optional[bool] = None
