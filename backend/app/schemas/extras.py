from __future__ import annotations

import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, model_validator


# ---------------------------------------------------------------------------
# GiftCard schemas
# ---------------------------------------------------------------------------


class GiftCardCreate(BaseModel):
    initial_balance: Decimal
    currency: str = "MXN"
    expires_at: datetime | None = None
    # code is generated server-side — not accepted from client


class GiftCardRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    code: str
    initial_balance: Decimal
    current_balance: Decimal
    currency: str
    status: str
    expires_at: datetime | None
    created_at: datetime


class GiftCardRedeemRequest(BaseModel):
    code: str
    amount: Decimal

    @model_validator(mode="after")
    def amount_positive(self) -> GiftCardRedeemRequest:
        if self.amount <= 0:
            raise ValueError("amount must be positive")
        return self


# ---------------------------------------------------------------------------
# Return schemas
# ---------------------------------------------------------------------------


class ReturnItemCreate(BaseModel):
    original_sale_item_id: uuid.UUID
    quantity_returned: Decimal
    unit_price_mxn: Decimal


class ReturnCreate(BaseModel):
    original_sale_id: uuid.UUID
    reason: str
    refund_method: str  # cash | gift_card | store_credit
    items: list[ReturnItemCreate]

    @model_validator(mode="after")
    def validate_refund_method(self) -> ReturnCreate:
        valid = {"cash", "gift_card", "store_credit"}
        if self.refund_method not in valid:
            raise ValueError(f"refund_method must be one of {valid}")
        return self


class ReturnRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    folio: str
    original_sale_id: uuid.UUID
    reason: str
    total_returned_mxn: Decimal
    refund_method: str
    generated_gift_card_id: uuid.UUID | None
    created_at: datetime


# ---------------------------------------------------------------------------
# ExchangeRate schemas
# ---------------------------------------------------------------------------


class ExchangeRateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    pair: str
    rate: Decimal
    source: str
    date: date
    created_at: datetime
