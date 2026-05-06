from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

import structlog
from fastapi import HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.category import Category
from app.models.product import Product
from app.models.stock_movement import StockMovement, MOVEMENT_TYPES
from app.schemas.product import CategoryCreate, CategoryRead, ProductCreate, ProductUpdate
from app.schemas.catalog import CategoryUpdate

log = structlog.get_logger()

# ─────────────────────────────────────────────────────────────────────────────
# Category operations
# ─────────────────────────────────────────────────────────────────────────────


async def list_categories(
    session: AsyncSession,
    *,
    active_only: bool = True,
) -> list[Category]:
    """Return all categories for the default tenant, optionally filtered to active."""
    stmt = select(Category)
    if active_only:
        stmt = stmt.where(Category.deleted_at.is_(None))
    stmt = stmt.order_by(Category.sort_order, Category.name)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_category(session: AsyncSession, category_id: uuid.UUID) -> Category:
    """Return a single category or raise HTTP 404."""
    stmt = select(Category).where(
        Category.id == category_id,
        Category.deleted_at.is_(None),
    )
    result = await session.execute(stmt)
    cat = result.scalar_one_or_none()
    if cat is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Categoría {category_id} no encontrada",
        )
    return cat


async def create_category(
    session: AsyncSession,
    data: CategoryCreate,
) -> Category:
    """Persist a new category and return the saved ORM instance."""
    cat = Category(
        name=data.name,
        parent_id=data.parent_id,
        sort_order=data.sort_order,
    )
    session.add(cat)
    try:
        await session.commit()
        await session.refresh(cat)
    except Exception as exc:
        await session.rollback()
        log.error("catalog.category.create_failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una categoría con ese nombre en este nivel",
        ) from exc
    log.info("catalog.category.created", category_id=str(cat.id), name=cat.name)
    return cat


async def update_category(
    session: AsyncSession,
    cat: Category,
    data: CategoryUpdate,
) -> Category:
    """Apply a partial update to *cat* and persist."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(cat, field, value)
    try:
        await session.commit()
        await session.refresh(cat)
    except Exception as exc:
        await session.rollback()
        log.error("catalog.category.update_failed", category_id=str(cat.id), error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo actualizar la categoría (nombre duplicado o error de datos)",
        ) from exc
    log.info("catalog.category.updated", category_id=str(cat.id))
    return cat


async def delete_category(session: AsyncSession, cat: Category) -> None:
    """Soft-delete a category (sets deleted_at = now)."""
    cat.deleted_at = datetime.now(tz=timezone.utc)
    await session.commit()
    log.info("catalog.category.deleted", category_id=str(cat.id))


# ─────────────────────────────────────────────────────────────────────────────
# Product operations
# ─────────────────────────────────────────────────────────────────────────────


async def list_products(
    session: AsyncSession,
    *,
    search: Optional[str] = None,
    category_id: Optional[uuid.UUID] = None,
    is_active: Optional[bool] = True,
    skip: int = 0,
    limit: int = 50,
) -> list[Product]:
    """
    Return a paginated list of products.

    *search* performs a case-insensitive LIKE match on name + sku — compatible
    with every Postgres setup without requiring pg_trgm extension.
    """
    stmt = select(Product).where(Product.deleted_at.is_(None))

    if is_active is not None:
        stmt = stmt.where(Product.is_active == is_active)
    if category_id is not None:
        stmt = stmt.where(Product.category_id == category_id)
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            Product.name.ilike(pattern) | Product.sku.ilike(pattern)
        )

    stmt = stmt.order_by(Product.name).offset(skip).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_product(session: AsyncSession, product_id: uuid.UUID) -> Product:
    """Return a single active product or raise HTTP 404."""
    stmt = select(Product).where(
        Product.id == product_id,
        Product.deleted_at.is_(None),
    )
    result = await session.execute(stmt)
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Producto {product_id} no encontrado",
        )
    return product


async def get_product_by_sku(
    session: AsyncSession,
    sku: str,
) -> Optional[Product]:
    """Return the product with the given SKU, or None if not found."""
    stmt = select(Product).where(
        Product.sku == sku,
        Product.deleted_at.is_(None),
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def create_product(
    session: AsyncSession,
    data: ProductCreate,
) -> Product:
    """Persist a new product and return the saved ORM instance."""
    product = Product(
        sku=data.sku,
        barcode=data.barcode,
        name=data.name,
        description=data.description,
        category_id=data.category_id,
        price_general=data.price_general,
        price_a=data.price_a,
        price_b=data.price_b,
        price_c=data.price_c,
        last_cost=data.last_cost,
        track_inventory=data.track_inventory,
        stock_quantity=data.stock_quantity,
        reorder_point=data.reorder_point,
        unit_of_measure=data.unit_of_measure,
        is_consigned=data.is_consigned,
        consigned_supplier_id=data.consigned_supplier_id,
        attributes=data.attributes,
        is_active=data.is_active,
    )
    session.add(product)
    try:
        await session.commit()
        await session.refresh(product)
    except Exception as exc:
        await session.rollback()
        log.error("catalog.product.create_failed", sku=data.sku, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Ya existe un producto con el SKU '{data.sku}'",
        ) from exc
    log.info("catalog.product.created", product_id=str(product.id), sku=product.sku)
    return product


async def update_product(
    session: AsyncSession,
    product: Product,
    data: ProductUpdate,
) -> Product:
    """Apply a partial update to *product* and persist."""
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    try:
        await session.commit()
        await session.refresh(product)
    except Exception as exc:
        await session.rollback()
        log.error("catalog.product.update_failed", product_id=str(product.id), error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo actualizar el producto",
        ) from exc
    log.info("catalog.product.updated", product_id=str(product.id))
    return product


async def soft_delete_product(session: AsyncSession, product: Product) -> None:
    """Soft-delete a product (sets deleted_at = now)."""
    product.deleted_at = datetime.now(tz=timezone.utc)
    await session.commit()
    log.info("catalog.product.deleted", product_id=str(product.id))


# ─────────────────────────────────────────────────────────────────────────────
# Inventory operations
# ─────────────────────────────────────────────────────────────────────────────


async def adjust_stock(
    session: AsyncSession,
    product: Product,
    delta: Decimal,
    movement_type: str,
    user_id: uuid.UUID,
    *,
    reference_type: Optional[str] = None,
    reference_id: Optional[uuid.UUID] = None,
    unit_cost_mxn: Optional[Decimal] = None,
    note: Optional[str] = None,
) -> StockMovement:
    """
    Atomically update *product.stock_quantity* by *delta* and record a
    StockMovement.  *delta* may be positive (stock in) or negative (stock out).

    Raises HTTP 400 if *movement_type* is not a recognised value.
    Raises HTTP 400 if the resulting quantity would go below zero for tracked
    products when processing an outbound movement.
    """
    if movement_type not in MOVEMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tipo de movimiento inválido: '{movement_type}'. "
                   f"Valores aceptados: {', '.join(MOVEMENT_TYPES)}",
        )

    quantity_before = product.stock_quantity
    quantity_after = quantity_before + delta

    if product.track_inventory and quantity_after < Decimal("0"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Stock insuficiente: existencia actual {quantity_before}, "
                f"ajuste solicitado {delta}"
            ),
        )

    product.stock_quantity = quantity_after

    movement = StockMovement(
        product_id=product.id,
        movement_type=movement_type,
        quantity=delta,
        reference_type=reference_type,
        reference_id=reference_id,
        unit_cost=unit_cost_mxn,
        notes=note,
        actor_id=user_id,
        tenant_id=product.tenant_id,
    )
    session.add(movement)

    try:
        await session.commit()
        await session.refresh(movement)
        await session.refresh(product)
    except Exception as exc:
        await session.rollback()
        log.error(
            "catalog.stock.adjust_failed",
            product_id=str(product.id),
            delta=str(delta),
            error=str(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al registrar el movimiento de inventario",
        ) from exc

    log.info(
        "catalog.stock.adjusted",
        product_id=str(product.id),
        movement_type=movement_type,
        delta=str(delta),
        before=str(quantity_before),
        after=str(quantity_after),
    )
    return movement


async def get_stock_movements(
    session: AsyncSession,
    product_id: uuid.UUID,
    *,
    skip: int = 0,
    limit: int = 50,
) -> list[StockMovement]:
    """Return paginated stock movements for a product, most recent first."""
    stmt = (
        select(StockMovement)
        .where(StockMovement.product_id == product_id)
        .order_by(StockMovement.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
