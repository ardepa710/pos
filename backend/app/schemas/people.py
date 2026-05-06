import uuid
from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field, EmailStr


class CustomerCreate(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    full_name: str = Field(min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    rfc: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    price_tier: str = Field(default="general", pattern="^(general|a|b|c)$")
    notes: Optional[str] = None


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    rfc: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    price_tier: Optional[str] = Field(None, pattern="^(general|a|b|c)$")
    notes: Optional[str] = None


class CustomerRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    code: str
    full_name: str
    email: Optional[str]
    phone: Optional[str]
    rfc: Optional[str]
    address: Optional[str]
    price_tier: str
    is_default: bool
    notes: Optional[str]
    created_at: datetime


class SupplierCreate(BaseModel):
    code: str = Field(min_length=1, max_length=20)
    legal_name: str = Field(min_length=2, max_length=200)
    contact_name: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    rfc: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    supplier_type: str = Field(default="normal", pattern="^(normal|consignment|both)$")
    consignment_period_days: Optional[int] = Field(None, ge=1)
    consignment_commission_pct: Optional[Decimal] = Field(None, ge=Decimal("0"), le=Decimal("1"))
    payment_terms_days: int = 0
    notes: Optional[str] = None


class SupplierUpdate(BaseModel):
    legal_name: Optional[str] = Field(None, max_length=200)
    contact_name: Optional[str] = Field(None, max_length=150)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=30)
    supplier_type: Optional[str] = Field(None, pattern="^(normal|consignment|both)$")
    consignment_period_days: Optional[int] = Field(None, ge=1)
    consignment_commission_pct: Optional[Decimal] = Field(None, ge=Decimal("0"), le=Decimal("1"))
    payment_terms_days: Optional[int] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class SupplierRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    code: str
    legal_name: str
    contact_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    rfc: Optional[str]
    supplier_type: str
    consignment_period_days: Optional[int]
    consignment_commission_pct: Optional[Decimal]
    payment_terms_days: int
    is_active: bool
    created_at: datetime
