"""Access-control tests — covers the RBAC findings: suppliers/customers writes
require supervisor, reports require supervisor, and the cashier-session IDOR.

These go through the real ASGI app so the route dependencies are exercised.
Seed users are committed via `maker` so the request's own session sees them.
"""
from __future__ import annotations

import uuid

from tests.factories import auth_header, make_user, open_session_for


async def _committed_user(maker, role: str):
    async with maker() as s:
        async with s.begin():
            user = await make_user(s, role=role)
    return user


async def test_cashier_cannot_create_supplier(client, maker) -> None:
    cashier = await _committed_user(maker, "cashier")
    body = {"code": f"S{uuid.uuid4().hex[:6]}", "legal_name": "Proveedor Test"}
    r = await client.post("/api/v1/suppliers", json=body, headers=auth_header(cashier))
    assert r.status_code == 403


async def test_supervisor_can_create_supplier(client, maker) -> None:
    sup = await _committed_user(maker, "supervisor")
    body = {"code": f"S{uuid.uuid4().hex[:6]}", "legal_name": "Proveedor Test"}
    r = await client.post("/api/v1/suppliers", json=body, headers=auth_header(sup))
    assert r.status_code == 201


async def test_cashier_cannot_create_customer(client, maker) -> None:
    cashier = await _committed_user(maker, "cashier")
    body = {"code": f"C{uuid.uuid4().hex[:6]}", "full_name": "Cliente Test"}
    r = await client.post("/api/v1/customers", json=body, headers=auth_header(cashier))
    assert r.status_code == 403


async def test_cashier_can_read_customers(client, maker) -> None:
    cashier = await _committed_user(maker, "cashier")
    r = await client.get("/api/v1/customers", headers=auth_header(cashier))
    assert r.status_code == 200


async def test_cashier_cannot_access_reports(client, maker) -> None:
    cashier = await _committed_user(maker, "cashier")
    r = await client.get("/api/v1/reports/daily", headers=auth_header(cashier))
    assert r.status_code == 403


async def test_supervisor_can_access_reports(client, maker) -> None:
    sup = await _committed_user(maker, "supervisor")
    r = await client.get("/api/v1/reports/daily", headers=auth_header(sup))
    assert r.status_code == 200


async def test_session_idor_blocked_for_other_cashier(client, maker) -> None:
    async with maker() as s:
        async with s.begin():
            owner = await make_user(s, role="cashier")
            other = await make_user(s, role="cashier")
            cs = await open_session_for(s, owner)
        session_id = cs.id

    # The owner can read it.
    r_owner = await client.get(
        f"/api/v1/sales/sessions/{session_id}", headers=auth_header(owner)
    )
    assert r_owner.status_code == 200

    # A different cashier cannot.
    r_other = await client.get(
        f"/api/v1/sales/sessions/{session_id}", headers=auth_header(other)
    )
    assert r_other.status_code == 403


async def test_unauthenticated_is_rejected(client) -> None:
    r = await client.get("/api/v1/customers")
    assert r.status_code in (401, 403)  # rejected without credentials
