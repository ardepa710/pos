from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field


class CategoryUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class StockMovementRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    product_id: uuid.UUID
    movement_type: str
    quantity: Decimal
    reference_type: Optional[str]
    reference_id: Optional[uuid.UUID]
    unit_cost: Optional[Decimal]
    notes: Optional[str]
    actor_id: Optional[uuid.UUID]
    created_at: datetime
