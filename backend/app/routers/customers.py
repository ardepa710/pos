from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.customer import Customer
from app.schemas.people import CustomerCreate, CustomerRead, CustomerUpdate
from app.security.dependencies import CurrentUser

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])

DbSession = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=list[CustomerRead], summary="Listar clientes")
async def list_customers(
    _user: CurrentUser,
    session: DbSession,
    search: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
) -> list[CustomerRead]:
    stmt = select(Customer).where(Customer.deleted_at.is_(None))
    if search:
        term = f"%{search}%"
        stmt = stmt.where(
            or_(
                Customer.full_name.ilike(term),
                Customer.code.ilike(term),
                Customer.email.ilike(term),
            )
        )
    stmt = stmt.order_by(Customer.full_name).offset(skip).limit(limit)
    result = await session.execute(stmt)
    return [CustomerRead.model_validate(c) for c in result.scalars().all()]


@router.post("", response_model=CustomerRead, status_code=status.HTTP_201_CREATED, summary="Crear cliente")
async def create_customer(
    data: CustomerCreate,
    _user: CurrentUser,
    session: DbSession,
) -> CustomerRead:
    existing = await session.execute(
        select(Customer).where(Customer.code == data.code, Customer.deleted_at.is_(None))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ya existe un cliente con ese código")
    customer = Customer(**data.model_dump())
    session.add(customer)
    await session.flush()
    await session.refresh(customer)
    return CustomerRead.model_validate(customer)


@router.get("/{customer_id}", response_model=CustomerRead, summary="Obtener cliente")
async def get_customer(
    customer_id: uuid.UUID,
    _user: CurrentUser,
    session: DbSession,
) -> CustomerRead:
    result = await session.execute(
        select(Customer).where(Customer.id == customer_id, Customer.deleted_at.is_(None))
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return CustomerRead.model_validate(customer)


@router.put("/{customer_id}", response_model=CustomerRead, summary="Actualizar cliente")
async def update_customer(
    customer_id: uuid.UUID,
    data: CustomerUpdate,
    _user: CurrentUser,
    session: DbSession,
) -> CustomerRead:
    result = await session.execute(
        select(Customer).where(Customer.id == customer_id, Customer.deleted_at.is_(None))
    )
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(customer, field, value)
    await session.flush()
    await session.refresh(customer)
    return CustomerRead.model_validate(customer)
