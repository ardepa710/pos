# POS License Library

Biblioteca de licenciamiento para el POS. Soporta 3 modos:

| Modo                | Descripcion                                    |
| ------------------- | ---------------------------------------------- |
| `none`              | Sin DRM — siempre valido                       |
| `offline_key`       | Clave firmada Ed25519 — funciona sin internet  |
| `online_activation` | Verificacion diaria — 7 dias de gracia offline |

## Uso en el backend

```python
from license_lib import create_license_manager

mgr = create_license_manager(
    mode=settings.license_mode,
    public_key_pem=settings.license_public_key,
    activation_server=settings.license_activation_server,
)

# En startup:
result = await mgr.verify(stored_license_key)
if not result.valid:
    raise RuntimeError(f"Invalid license: {result.error}")
```

## Generar claves (modo offline_key)

```bash
python keygen.py generate-keys
python keygen.py sign --private-key private.pem --business "Mi Tienda" --expires 2027-12-31
```
