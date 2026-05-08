import uuid
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field, field_validator


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
    ticket_header: Optional[str]
    ticket_footer: Optional[str]
    ticket_show_logo: bool
    ticket_show_iva: bool
    ticket_printer_name: Optional[str]
    telemetry_enabled: bool
    updated_at: datetime


class BusinessSettingsUpdate(BaseModel):
    # Normalise empty strings to None so exclude_none=True skips them and
    # they never overwrite existing values with an empty string in the DB.
    @field_validator(
        "ticket_header", "ticket_footer", "address", "receipt_footer",
        "logo_url", "logo_small_url", "favicon_url",
        mode="before",
    )
    @classmethod
    def empty_str_to_none(cls, v: object) -> object:
        if isinstance(v, str) and not v.strip():
            return None
        return v

    @field_validator("logo_url", "logo_small_url", "favicon_url", mode="after")
    @classmethod
    def must_be_https(cls, v: str | None) -> str | None:
        if v is not None and not v.startswith("https://"):
            raise ValueError("La URL debe usar HTTPS")
        return v

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
    ticket_header: Optional[str] = None
    ticket_footer: Optional[str] = None
    ticket_show_logo: Optional[bool] = None
    ticket_show_iva: Optional[bool] = None
    ticket_printer_name: Optional[str] = Field(None, max_length=255)
    telemetry_enabled: Optional[bool] = None
