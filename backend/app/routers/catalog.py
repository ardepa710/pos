from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.schemas.catalog import CategoryUpdate, StockMovementRead
from app.schemas.product import (
    CategoryCreate,
    CategoryRead,
    ProductCreate,
    ProductListResponse,
    ProductRead,
    ProductUpdate,
    StockAdjustRequest,
)
from app.security.dependencies import AdminUser, CurrentUser, SupervisorUser
import app.services.catalog_service as svc

router = APIRouter(prefix="/api/v1", tags=["catalog"])

DbSession = Annotated[AsyncSession, Depends(get_session)]

# ─────────────────────────────────────────────────────────────────────────────
# Categories
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/categories",
    response_model=list[CategoryRead],
    summary="Listar categorías",
)
async def list_categories(
    _current_user: CurrentUser,
    session: DbSession,
    active_only: bool = Query(True, description="Mostrar sólo categorías activas"),
) -> list[CategoryRead]:
    categories = await svc.list_categories(session, active_only=active_only)
    return [CategoryRead.model_validate(c) for c in categories]


@router.post(
    "/categories",
    response_model=CategoryRead,
    status_code=201,
    summary="Crear categoría",
)
async def create_category(
    _current_user: AdminUser,
    session: DbSession,
    data: CategoryCreate,
) -> CategoryRead:
    cat = await svc.create_category(session, data)
    return CategoryRead.model_validate(cat)


@router.get(
    "/categories/{category_id}",
    response_model=CategoryRead,
    summary="Obtener categoría",
)
async def get_category(
    category_id: uuid.UUID,
    _current_user: CurrentUser,
    session: DbSession,
) -> CategoryRead:
    cat = await svc.get_category(session, category_id)
    return CategoryRead.model_validate(cat)


@router.put(
    "/categories/{category_id}",
    response_model=CategoryRead,
    summary="Actualizar categoría",
)
async def update_category(
    category_id: uuid.UUID,
    _current_user: AdminUser,
    session: DbSession,
    data: CategoryUpdate,
) -> CategoryRead:
    cat = await svc.get_category(session, category_id)
    cat = await svc.update_category(session, cat, data)
    return CategoryRead.model_validate(cat)


@router.delete(
    "/categories/{category_id}",
    status_code=204,
    summary="Eliminar categoría",
)
async def delete_category(
    category_id: uuid.UUID,
    _current_user: AdminUser,
    session: DbSession,
) -> None:
    cat = await svc.get_category(session, category_id)
    await svc.delete_category(session, cat)


# ─────────────────────────────────────────────────────────────────────────────
# Products
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/products",
    response_model=ProductListResponse,
    summary="Listar productos",
)
async def list_products(
    _current_user: CurrentUser,
    session: DbSession,
    search: Optional[str] = Query(None, description="Buscar por nombre o SKU"),
    category_id: Optional[uuid.UUID] = Query(None, description="Filtrar por categoría"),
    is_active: Optional[bool] = Query(True, description="Filtrar por estado activo"),
    page: int = Query(1, ge=1, description="Número de página"),
    page_size: int = Query(50, ge=1, le=200, description="Resultados por página"),
) -> ProductListResponse:
    skip = (page - 1) * page_size
    products = await svc.list_products(
        session,
        search=search,
        category_id=category_id,
        is_active=is_active,
        skip=skip,
        limit=page_size,
    )
    items = [ProductRead.model_validate(p) for p in products]
    return ProductListResponse(
        items=items,
        total=len(items),  # simplified count — sufficient for this POS scale
        page=page,
        page_size=page_size,
    )


@router.post(
    "/products",
    response_model=ProductRead,
    status_code=201,
    summary="Crear producto",
)
async def create_product(
    _current_user: AdminUser,
    session: DbSession,
    data: ProductCreate,
) -> ProductRead:
    product = await svc.create_product(session, data)
    return ProductRead.model_validate(product)


@router.get(
    "/products/{product_id}",
    response_model=ProductRead,
    summary="Obtener producto",
)
async def get_product(
    product_id: uuid.UUID,
    _current_user: CurrentUser,
    session: DbSession,
) -> ProductRead:
    product = await svc.get_product(session, product_id)
    return ProductRead.model_validate(product)


@router.put(
    "/products/{product_id}",
    response_model=ProductRead,
    summary="Actualizar producto",
)
async def update_product(
    product_id: uuid.UUID,
    _current_user: AdminUser,
    session: DbSession,
    data: ProductUpdate,
) -> ProductRead:
    product = await svc.get_product(session, product_id)
    product = await svc.update_product(session, product, data)
    return ProductRead.model_validate(product)


@router.delete(
    "/products/{product_id}",
    status_code=204,
    summary="Eliminar producto (soft delete)",
)
async def delete_product(
    product_id: uuid.UUID,
    _current_user: AdminUser,
    session: DbSession,
) -> None:
    product = await svc.get_product(session, product_id)
    await svc.soft_delete_product(session, product)


# ─────────────────────────────────────────────────────────────────────────────
# Inventory
# ─────────────────────────────────────────────────────────────────────────────


@router.get(
    "/products/{product_id}/stock-movements",
    response_model=list[StockMovementRead],
    summary="Historial de movimientos de inventario",
)
async def list_stock_movements(
    product_id: uuid.UUID,
    _current_user: CurrentUser,
    session: DbSession,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> list[StockMovementRead]:
    # Verify product exists before fetching movements
    await svc.get_product(session, product_id)
    skip = (page - 1) * page_size
    movements = await svc.get_stock_movements(session, product_id, skip=skip, limit=page_size)
    return [StockMovementRead.model_validate(m) for m in movements]


@router.post(
    "/products/{product_id}/adjust-stock",
    response_model=StockMovementRead,
    status_code=201,
    summary="Ajuste manual de inventario",
)
async def adjust_stock(
    product_id: uuid.UUID,
    current_user: SupervisorUser,
    session: DbSession,
    body: StockAdjustRequest,
) -> StockMovementRead:
    product = await svc.get_product(session, product_id)

    # Determine movement_type from the sign of the quantity delta
    if body.quantity >= 0:
        movement_type = "adjustment_in"
    else:
        movement_type = "adjustment_out"

    movement = await svc.adjust_stock(
        session,
        product,
        delta=body.quantity,
        movement_type=movement_type,
        user_id=current_user.id,
        note=body.reason,
    )
    return StockMovementRead.model_validate(movement)
