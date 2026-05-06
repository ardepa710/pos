import uuid
from datetime import datetime
from typing import Optional, Any
from decimal import Decimal
from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    parent_id: Optional[uuid.UUID] = None
    sort_order: int = 0


class CategoryRead(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    name: str
    parent_id: Optional[uuid.UUID]
    sort_order: int
    created_at: datetime


class ProductCreate(BaseModel):
    sku: str = Field(min_length=1, max_length=40)
    barcode: Optional[str] = Field(None, max_length=40)
    name: str = Field(min_length=1, max_length=200)
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    price_general: Decimal = Field(ge=Decimal("0"))
    price_a: Optional[Decimal] = Field(None, ge=Decimal("0"))
    price_b: Optional[Decimal] = Field(None, ge=Decimal("0"))
    price_c: Optional[Decimal] = Field(None, ge=Decimal("0"))
    last_cost: Optional[Decimal] = Field(None, ge=Decimal("0"))
    track_inventory: bool = True
    stock_quantity: Decimal = Decimal("0")
    reorder_point: Optional[Decimal] = None
    unit_of_measure: str = "pza"
    is_consigned: bool = False
    consigned_supplier_id: Optional[uuid.UUID] = None
    attributes: dict[str, Any] = {}
    is_active: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    category_id: Optional[uuid.UUID] = None
    price_general: Optional[Decimal] = Field(None, ge=Decimal("0"))
    price_a: Optional[Decimal] = Field(None, ge=Decimal("0"))
    price_b: Optional[Decimal] = Field(None, ge=Decimal("0"))
    price_c: Optional[Decimal] = Field(None, ge=Decimal("0"))
    track_inventory: Optional[bool] = None
    reorder_point: Optional[Decimal] = None
    unit_of_measure: Optional[str] = None
    attributes: Optional[dict[str, Any]] = None
    is_active: Optional[bool] = None
    thumbnail_url: Optional[str] = None


class ProductRead(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    sku: str
    barcode: Optional[str]
    name: str
    description: Optional[str]
    category_id: Optional[uuid.UUID]
    price_general: Decimal
    price_a: Optional[Decimal]
    price_b: Optional[Decimal]
    price_c: Optional[Decimal]
    last_cost: Optional[Decimal]
    track_inventory: bool
    stock_quantity: Decimal
    reorder_point: Optional[Decimal]
    unit_of_measure: str
    is_consigned: bool
    consigned_supplier_id: Optional[uuid.UUID]
    attributes: dict[str, Any]
    thumbnail_url: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime


class StockAdjustRequest(BaseModel):
    quantity: Decimal = Field(..., description="Positive to add, negative to subtract")
    reason: str = Field(min_length=1, max_length=200)


class ProductListResponse(BaseModel):
    items: list[ProductRead]
    total: int
    page: int
    page_size: int
