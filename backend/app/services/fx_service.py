from __future__ import annotations

import structlog
from datetime import date, datetime, timezone
from decimal import Decimal

import httpx
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models.exchange_rate import ExchangeRate

log = structlog.get_logger()

BANXICO_SERIES = "SF43718"  # USD/MXN FIX rate series
BANXICO_BASE_URL = "https://www.banxico.org.mx/SieAPIRest/service/v1"
FALLBACK_RATE = Decimal("17.50")
TENANT_DEFAULT = "00000000-0000-0000-0000-000000000001"


async def fetch_banxico_rate(fetch_date: date | None = None) -> Decimal:
    """Fetch USD/MXN rate from Banxico SIE REST API.

    Uses the 'oportuno' (latest available) endpoint unless a specific date
    is provided. Falls back to FALLBACK_RATE if the API is unavailable or
    the API key is not configured.
    """
    if not settings.banxico_api_key:
        log.warning("banxico.api_key_missing", fallback=str(FALLBACK_RATE))
        return FALLBACK_RATE

    if fetch_date is not None:
        date_str = fetch_date.strftime("%Y-%m-%d")
        url = f"{BANXICO_BASE_URL}/series/{BANXICO_SERIES}/datos/{date_str}/{date_str}"
    else:
        url = f"{BANXICO_BASE_URL}/series/{BANXICO_SERIES}/datos/oportuno"

    headers = {"Bmx-Token": settings.banxico_api_key}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            payload = response.json()

        # Response shape: {"bmx": {"series": [{"idSerie": "SF43718", "datos": [{"fecha": "...", "dato": "..."}]}]}}
        series_list = payload.get("bmx", {}).get("series", [])
        if not series_list:
            raise ValueError("Banxico response contained no series data")

        datos = series_list[0].get("datos", [])
        if not datos:
            raise ValueError("Banxico response contained no data points")

        dato_value: str = datos[-1]["dato"]
        if dato_value in ("N/E", ""):
            raise ValueError(f"Banxico returned non-numeric value: {dato_value}")

        rate = Decimal(dato_value)
        log.info("banxico.rate_fetched", rate=str(rate))
        return rate

    except (httpx.HTTPError, KeyError, ValueError, Exception) as exc:
        log.warning("banxico.fetch_failed", error=str(exc), fallback=str(FALLBACK_RATE))
        return FALLBACK_RATE


async def get_current_rate(session: AsyncSession) -> Decimal:
    """Return today's USD/MXN rate.

    Priority:
    1. Today's row in exchange_rates table.
    2. Fresh fetch from Banxico (if key is configured), stored in DB.
    3. Most recent stored rate (any date).
    4. Hardcoded FALLBACK_RATE if no rate exists anywhere.
    """
    today = datetime.now(tz=timezone.utc).date()

    # 1. Check DB for today's rate
    result = await session.execute(
        select(ExchangeRate)
        .where(ExchangeRate.pair == "USD_MXN", ExchangeRate.date == today)
        .limit(1)
    )
    existing = result.scalar_one_or_none()
    if existing is not None:
        return Decimal(str(existing.rate))

    # 2. Fetch from Banxico
    fetched_rate = await fetch_banxico_rate()

    if fetched_rate != FALLBACK_RATE:
        # Store the freshly fetched rate
        await store_rate(session, fetched_rate)
        return fetched_rate

    # 3. If Banxico failed, try last known rate from DB
    result = await session.execute(
        select(ExchangeRate)
        .where(ExchangeRate.pair == "USD_MXN")
        .order_by(desc(ExchangeRate.date))
        .limit(1)
    )
    last_known = result.scalar_one_or_none()
    if last_known is not None:
        log.warning(
            "banxico.using_last_known_rate",
            rate=str(last_known.rate),
            date=str(last_known.date),
        )
        return Decimal(str(last_known.rate))

    # 4. Absolute fallback
    log.warning("banxico.using_hardcoded_fallback", rate=str(FALLBACK_RATE))
    return FALLBACK_RATE


async def store_rate(
    session: AsyncSession,
    rate: Decimal,
    source: str = "banxico",
) -> ExchangeRate:
    """Upsert exchange rate for today with pair='USD_MXN'.

    If a row for today already exists, update rate + source.
    Otherwise insert a new row.
    """
    today = datetime.now(tz=timezone.utc).date()

    result = await session.execute(
        select(ExchangeRate)
        .where(ExchangeRate.pair == "USD_MXN", ExchangeRate.date == today)
        .limit(1)
    )
    exchange_rate = result.scalar_one_or_none()

    if exchange_rate is None:
        exchange_rate = ExchangeRate(
            pair="USD_MXN",
            rate=float(rate),
            source=source,
            date=today,
        )
        session.add(exchange_rate)
    else:
        exchange_rate.rate = float(rate)  # type: ignore[assignment]
        exchange_rate.source = source  # type: ignore[assignment]

    await session.flush()
    log.info("banxico.rate_stored", rate=str(rate), date=str(today), source=source)
    return exchange_rate
