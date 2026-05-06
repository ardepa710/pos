# POS Print Bridge

Daemon ligero para imprimir en impresoras USB térmicas desde el POS.

## Uso

### Desarrollo

```bash
pip install -e .
python main.py
```

### Producción (ejecutable)

```bash
bash build.sh
./dist/pos-print-bridge
```

## Endpoints

- `GET /health` — estado del daemon
- `GET /printers` — lista impresoras USB disponibles
- `POST /print` — envía recibo a impresora

## Integración con POS

El frontend llama directamente a `http://localhost:9100/print` (bypasa Docker).
Configurar en Settings → Impresoras → USB via Print Bridge.
