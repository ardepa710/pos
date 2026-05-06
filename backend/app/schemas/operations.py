from __future__ import annotations

import uuid
from datetime import datetime, date
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, Field, model_validator


# ── Purchase schemas ─────────────────────────────────────────────

class PurchaseItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: Decimal = Field(gt=Decimal("0"))
    unit_cost: Decimal = Field(ge=Decimal("0"))


class PurchaseCreate(BaseModel):
    supplier_id: uuid.UUID
    purchase_type: str = Field(pattern="^(normal|consignment)$")
    currency: str = Field(default="MXN", pattern="^(MXN|USD)$")
    exchange_rate: Optional[Decimal] = None
    notes: Optional[str] = None
    items: list[PurchaseItemCreate] = Field(min_length=1)
    consignment_period_start: Optional[date] = None
    consignment_period_end: Optional[date] = None


class PurchaseRead(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    folio: str
    supplier_id: uuid.UUID
    purchase_type: str
    status: str
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    currency: str
    created_by: uuid.UUID
    approved_by: Optional[uuid.UUID]
    approved_at: Optional[datetime]
    consignment_settled: bool
    created_at: datetime
    updated_at: datetime


# ── Sale schemas ─────────────────────────────────────────────────

class SaleItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: Decimal = Field(gt=Decimal("0"))
    price_tier: str = Field(default="general", pattern="^(general|a|b|c)$")
    discount_mxn: Decimal = Field(default=Decimal("0"), ge=Decimal("0"))


class PaymentCreate(BaseModel):
    method: str = Field(pattern="^(cash|credit_card|debit_card|gift_card|transfer|other)$")
    currency: str = Field(default="MXN", pattern="^(MXN|USD)$")
    amount: Decimal = Field(gt=Decimal("0"))
    gift_card_id: Optional[uuid.UUID] = None
    terminal_reference: Optional[str] = Field(None, max_length=120)
    card_last4: Optional[str] = Field(None, max_length=4)

    @model_validator(mode="after")
    def validate_card_reference(self) -> "PaymentCreate":
        if self.method in ("credit_card", "debit_card") and not self.terminal_reference:
            raise ValueError("terminal_reference es obligatorio para pagos con tarjeta")
        return self


class SaleCreate(BaseModel):
    customer_id: uuid.UUID
    items: list[SaleItemCreate] = Field(min_length=1)
    payments: list[PaymentCreate] = Field(min_length=1)
    cashier_session_id: Optional[uuid.UUID] = None
    notes: Optional[str] = None


class SaleItemRead(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    product_id: uuid.UUID
    product_name_snapshot: str
    product_sku_snapshot: str
    quantity: Decimal
    unit_price_mxn: Decimal
    price_tier_used: str
    discount_mxn: Decimal
    subtotal_mxn: Decimal
    was_consigned: bool
    consigned_supplier_id: Optional[uuid.UUID]


class PaymentRead(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    method: str
    currency: str
    amount: Decimal
    amount_in_mxn: Decimal
    terminal_reference: Optional[str]
    gift_card_id: Optional[uuid.UUID]


class SaleRead(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    folio: str
    customer_id: uuid.UUID
    cashier_id: uuid.UUID
    status: str
    subtotal_mxn: Decimal
    tax_mxn: Decimal
    discount_mxn: Decimal
    total_mxn: Decimal
    total_usd: Decimal
    fx_rate_used: Decimal
    fx_rate_date: date
    items: list[SaleItemRead] = []
    payments: list[PaymentRead] = []
    created_at: datetime


class SaleVoidRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=500)


# ── CashierSession schemas ────────────────────────────────────────

class CashierSessionOpen(BaseModel):
    starting_cash_mxn: Decimal = Field(ge=Decimal("0"))


class CashierSessionClose(BaseModel):
    physical_cash_mxn: Decimal = Field(ge=Decimal("0"))


class CashierSessionRead(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    cashier_id: uuid.UUID
    status: str
    starting_cash_mxn: Decimal
    expected_cash_mxn: Optional[Decimal]
    physical_cash_mxn: Optional[Decimal]
    difference_mxn: Optional[Decimal]
    total_sales_mxn: Optional[Decimal]
    total_cash_payments: Optional[Decimal]
    total_card_payments: Optional[Decimal]
    total_gift_card_payments: Optional[Decimal]
    opened_at: datetime
    closed_at: Optional[datetime]
    created_at: datetime


# ── FX rate schema ────────────────────────────────────────────────

class FxRateRead(BaseModel):
    rate: Decimal
    pair: str
    date: str
