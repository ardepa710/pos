"""Lightweight object factories for tests. Each takes a session and flushes."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.cashier_session import CashierSession
from app.models.product import Product
from app.models.user import User
from app.security.jwt import create_access_token
from app.security.password import hash_password


async def make_user(
    session: AsyncSession, *, role: str = "cashier", password: str = "Passw0rd!"
) -> User:
    suffix = uuid.uuid4().hex[:8]
    user = User(
        username=f"u_{suffix}",
        email=f"{suffix}@test.mx",
        full_name="Test User",
        password_hash=hash_password(password),
        role=role,
    )
    session.add(user)
    await session.flush()
    return user


async def make_product(
    session: AsyncSession,
    *,
    stock: str = "100",
    price: str = "50",
    track_inventory: bool = True,
) -> Product:
    product = Product(
        sku=f"SKU{uuid.uuid4().hex[:8]}",
        name="Producto de prueba",
        price_general=Decimal(price),
        track_inventory=track_inventory,
        stock_quantity=Decimal(stock),
    )
    session.add(product)
    await session.flush()
    return product


async def open_session_for(
    session: AsyncSession, user: User, *, starting: str = "0"
) -> CashierSession:
    cs = CashierSession(
        cashier_id=user.id,
        status="open",
        starting_cash_mxn=Decimal(starting),
        total_sales_mxn=Decimal("0"),
        total_cash_payments=Decimal("0"),
        total_card_payments=Decimal("0"),
        total_gift_card_payments=Decimal("0"),
        opened_at=datetime.now(tz=timezone.utc),
    )
    session.add(cs)
    await session.flush()
    return cs


def auth_header(user: User) -> dict[str, str]:
    token = create_access_token({"sub": str(user.id)})
    return {"Authorization": f"Bearer {token}"}
