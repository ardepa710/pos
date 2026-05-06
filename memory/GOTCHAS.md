# Gotchas — POS

## Docker

- Usar `node:20-slim` (NUNCA alpine — OpenSSL rompe Prisma/bcrypt)
- COMPOSE_PROJECT distinto por ambiente para no colisionar en mismo host

## Python

- NUMERIC(12,2) para dinero; FLOAT nunca para valores monetarios
- Alembic: cada agente crea su migration con timestamp único; orquestador hace merge
- `set -e` en entrypoint.sh: crash en migración = restart correcto (no silencios)

## Next.js

- `output: "standalone"` obligatorio en next.config.ts para Docker
- `NEXT_PUBLIC_*` deben estar como ARG en stage builder del Dockerfile
- No usar `useEffect` para derivar estado → `useMemo` o cómputo en render

## Seguridad

- JWT en cookie HTTP-only, no localStorage
- Terminal reference obligatorio en pagos con tarjeta (DB constraint)
- HMAC en QR de gift cards para prevenir forja
