from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.supplier import Supplier
from app.schemas.people import SupplierCreate, SupplierRead, SupplierUpdate
from app.security.dependencies import CurrentUser

router = APIRouter(prefix="/api/v1/suppliers", tags=["suppliers"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=list[SupplierRead], summary="Listar proveedores")
async def list_suppliers(
    _user: CurrentUser,
    session: DbSession,
) -> list[SupplierRead]:
    result = await session.execute(
        select(Supplier).where(Supplier.deleted_at.is_(None)).order_by(Supplier.legal_name)
    )
    return [SupplierRead.model_validate(s) for s in result.scalars().all()]


@router.post("", response_model=SupplierRead, status_code=status.HTTP_201_CREATED, summary="Crear proveedor")
async def create_supplier(
    data: SupplierCreate,
    _user: CurrentUser,
    session: DbSession,
) -> SupplierRead:
    existing = await session.execute(
        select(Supplier).where(Supplier.code == data.code, Supplier.deleted_at.is_(None))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un proveedor con ese código")
    supplier = Supplier(**data.model_dump())
    session.add(supplier)
    await session.flush()
    await session.refresh(supplier)
    return SupplierRead.model_validate(supplier)


@router.get("/{supplier_id}", response_model=SupplierRead, summary="Obtener proveedor")
async def get_supplier(
    supplier_id: uuid.UUID,
    _user: CurrentUser,
    session: DbSession,
) -> SupplierRead:
    result = await session.execute(
        select(Supplier).where(Supplier.id == supplier_id, Supplier.deleted_at.is_(None))
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    return SupplierRead.model_validate(supplier)


@router.put("/{supplier_id}", response_model=SupplierRead, summary="Actualizar proveedor")
async def update_supplier(
    supplier_id: uuid.UUID,
    data: SupplierUpdate,
    _user: CurrentUser,
    session: DbSession,
) -> SupplierRead:
    result = await session.execute(
        select(Supplier).where(Supplier.id == supplier_id, Supplier.deleted_at.is_(None))
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(supplier, field, value)
    await session.flush()
    await session.refresh(supplier)
    return SupplierRead.model_validate(supplier)
