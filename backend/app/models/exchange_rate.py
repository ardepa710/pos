from __future__ import annotations

import uuid
from datetime import date, datetime

from sqlalchemy import (
    Date,
    DateTime,
    Index,
    Numeric,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base

TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


class ExchangeRate(Base):
    __tablename__ = "exchange_rates"
    __table_args__ = (
        UniqueConstraint(
            "tenant_id",
            "date",
            "pair",
            name="uq_exchange_rates_tenant_date_pair",
        ),
        Index("idx_exchange_rates_pair_date", "pair", "date"),
        Index("idx_exchange_rates_tenant_date", "tenant_id", "date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        PG_UUID(as_uuid=True),
        nullable=False,
        server_default=text(f"'{TENANT_DEFAULT}'::uuid"),
    )
    # Currency pair, e.g. "USD_MXN"
    pair: Mapped[str] = mapped_column(String(10), nullable=False)
    rate: Mapped[float] = mapped_column(Numeric(14, 6), nullable=False)
    source: Mapped[str] = mapped_column(
        String(50), nullable=False, server_default="banxico"
    )
    date: Mapped[date] = mapped_column(Date, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
