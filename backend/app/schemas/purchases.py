from __future__ import annotations

import uuid
from datetime import datetime, date
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Item-level schemas ────────────────────────────────────────────────────────


class PurchaseItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: Decimal = Field(gt=Decimal("0"))
    unit_cost: Decimal = Field(ge=Decimal("0"))


class PurchaseItemRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    product_name: Optional[str] = None
    quantity: Decimal
    unit_cost: Decimal
    subtotal: Decimal


# ── Regular purchase schemas ──────────────────────────────────────────────────


class PurchaseCreate(BaseModel):
    supplier_id: uuid.UUID
    currency: str = Field(default="MXN", pattern="^(MXN|USD)$")
    exchange_rate: Optional[Decimal] = None
    notes: Optional[str] = None
    items: list[PurchaseItemCreate] = Field(min_length=1)


class PurchaseRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    folio: str
    supplier_id: uuid.UUID
    purchase_type: str
    status: str
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    currency: str
    exchange_rate: Optional[Decimal]
    notes: Optional[str]
    created_by: uuid.UUID
    approved_by: Optional[uuid.UUID]
    approved_at: Optional[datetime]
    consignment_settled: bool
    consignment_period_start: Optional[date]
    consignment_period_end: Optional[date]
    received_at: Optional[datetime]
    items: list[PurchaseItemRead] = []
    created_at: datetime
    updated_at: datetime


# ── Consignment schemas ───────────────────────────────────────────────────────


class ConsignmentInRequest(BaseModel):
    supplier_id: uuid.UUID
    consignment_period_start: date
    consignment_period_end: date
    notes: Optional[str] = None
    items: list[PurchaseItemCreate] = Field(min_length=1)


class ConsignmentSettlementCreate(BaseModel):
    supplier_id: uuid.UUID
    purchase_id: uuid.UUID
    period_start: date
    period_end: date
    gross_sales: Decimal = Field(ge=Decimal("0"))
    commission_pct: Decimal = Field(ge=Decimal("0"), le=Decimal("1"))
    notes: Optional[str] = None


class ConsignmentSettlementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    folio: str
    supplier_id: uuid.UUID
    period_start: date
    period_end: date
    gross_sales: Decimal
    commission_pct: Decimal
    commission_amount: Decimal
    payable_to_supplier: Decimal
    status: str
    approved_by: Optional[uuid.UUID]
    approved_at: Optional[datetime]
    paid_at: Optional[datetime]
    payment_reference: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime
