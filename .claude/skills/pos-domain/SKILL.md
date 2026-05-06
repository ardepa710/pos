# Skill: pos-domain

## Propósito

Convenciones de dominio específicas del sistema POS: cálculo de divisas, formato de folios, reglas de inventario, gift cards, consignación, sesiones de caja.

## Reglas de divisas y dinero

### Tipos de datos

- **NUNCA usar FLOAT para dinero**. Siempre `NUMERIC(12,2)` en DB y `Decimal` en Python.
- Tasas de cambio: `NUMERIC(12,4)` (4 decimales para precisión).
- En Python: `from decimal import Decimal, ROUND_HALF_UP`.

### Redondeo

```python
def round_mxn(amount: Decimal) -> Decimal:
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
```

### Conversión USD → MXN

```python
def usd_to_mxn(usd: Decimal, fx_rate: Decimal) -> Decimal:
    return round_mxn(usd * fx_rate)
```

### Snapshot de tipo de cambio

Cada `sale` y `sale_item` almacena `fx_rate_snapshot` al momento de la venta. Nunca recalcular en reportes históricos — usar el snapshot.

## Folios

Formato: `{PREFIX}-{YYYY}{MM}-{NNNNNN}`

- Ventas: `VTA-202605-000001`
- Compras: `CMP-202605-000001`
- Devoluciones: `DEV-202605-000001`
- Tarjetas de regalo: `GC-202605-000001`

```python
def generate_folio(prefix: str, sequence: int) -> str:
    from datetime import date
    today = date.today()
    return f"{prefix}-{today.year}{today.month:02d}-{sequence:06d}"
```

La secuencia se obtiene de `SELECT nextval('folio_{prefix}_seq')` — secuencias por tipo.

## Inventario

### Movimientos de stock

Todos los cambios de inventario pasan por `stock_movements` (append-only). Nunca actualizar `products.stock` directamente — usar la función de servicio `adjust_stock()`.

```python
# Tipos de movimiento
class StockMovementType(str, Enum):
    PURCHASE = "purchase"        # compra normal
    SALE = "sale"                # venta
    RETURN = "return"            # devolución (suma)
    ADJUSTMENT = "adjustment"    # ajuste manual
    CONSIGNMENT_IN = "consignment_in"   # entrada en consignación
    CONSIGNMENT_OUT = "consignment_out" # salida en consignación
```

### Validación antes de venta

```python
async def check_stock(session, product_id: UUID, quantity: int) -> bool:
    product = await session.get(Product, product_id)
    if not product.track_inventory:
        return True
    return product.stock >= quantity
```

## Gift Cards

### Generación de QR payload

```python
import hmac, hashlib, base64, json

def generate_gc_payload(gc_id: str, initial_balance: Decimal, secret_key: str) -> str:
    data = {"id": gc_id, "initial_balance": str(initial_balance)}
    payload = json.dumps(data, separators=(",", ":"))
    signature = hmac.new(
        secret_key.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return base64.urlsafe_b64encode(f"{payload}|{signature}".encode()).decode()

def verify_gc_payload(encoded: str, secret_key: str) -> dict | None:
    try:
        decoded = base64.urlsafe_b64decode(encoded).decode()
        payload, sig = decoded.rsplit("|", 1)
        expected = hmac.new(secret_key.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if hmac.compare_digest(sig, expected):
            return json.loads(payload)
    except Exception:
        pass
    return None
```

### Balance de Gift Card

El balance es la suma de transacciones (append-only):

- `type=credit` → suma (emisión, recarga, devolución)
- `type=debit` → resta (uso en venta)

```python
async def get_gc_balance(session, gc_id: UUID) -> Decimal:
    result = await session.execute(
        select(func.sum(case(
            (GiftCardTransaction.type == "credit", GiftCardTransaction.amount),
            else_=-GiftCardTransaction.amount
        ))).where(GiftCardTransaction.gift_card_id == gc_id)
    )
    return result.scalar() or Decimal("0")
```

## Consignación

### Regla crítica

`sale_items.consigned_supplier_id` se snapshot al momento de la venta. Si el proveedor del producto cambia después, los reportes históricos permanecen correctos.

### Estados de compra de consignación

```
DRAFT → RECEIVED → PARTIALLY_SETTLED → FULLY_SETTLED
```

## Sesiones de caja (Cashier Sessions)

### Apertura

```python
class OpenSessionRequest(BaseModel):
    starting_cash_mxn: Decimal  # efectivo físico al abrir
    notes: str | None = None
```

### Cierre

```python
class CloseSessionRequest(BaseModel):
    physical_cash_mxn: Decimal  # conteo físico al cerrar
    # El sistema calcula: diferencia = physical - expected
```

### Cálculo de cuadre

```
expected_cash = starting_cash + sum(cash_payments) - sum(cash_returns)
difference = physical_cash - expected_cash
# difference > 0 → sobra | difference < 0 → falta
```

## Pagos con tarjeta

**OBLIGATORIO:** `terminal_reference` no puede ser NULL para `credit_card` o `debit_card`.
Esta restricción existe tanto en la DB (CHECK constraint) como en el schema Pydantic.

```python
class PaymentCreate(BaseModel):
    method: PaymentMethod
    amount: Decimal
    terminal_reference: str | None = None

    @model_validator(mode="after")
    def validate_card_reference(self) -> "PaymentCreate":
        if self.method in (PaymentMethod.CREDIT_CARD, PaymentMethod.DEBIT_CARD):
            if not self.terminal_reference:
                raise ValueError("terminal_reference es obligatorio para pagos con tarjeta")
        return self
```

## Programa de lealtad

- `LOYALTY_POINTS_RATE`: puntos por peso MXN gastado (default: 1 punto por $10 MXN)
- `LOYALTY_POINTS_VALUE`: valor de cada punto en MXN (default: $0.10)
- Los puntos se acumulan al completar la venta (status=completed)
- La redención es un método de pago más (`loyalty_points`)
- Expiración configurable (default: 365 días desde última actividad)
