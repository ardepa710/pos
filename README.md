# Kolekto — Tu colectivo, conectado.

Kolekto es el POS para colectivos de vendedores — dockerizado y listo para producción, diseñado para pequeños y medianos negocios en México.

---

## ✨ Características principales

- **Ventas** — Registro rápido de ventas con múltiples productos, descuentos, cambio en MXN y USD
- **Caja** — Apertura y cierre de sesión de caja con control de efectivo inicial y conteo físico
- **Catálogo** — Gestión de productos, categorías, precios en MXN/USD y control de inventario
- **Clientes** — Base de datos de clientes con historial de compras y programa de lealtad
- **Compras** — Registro de compras a proveedores con actualización automática de inventario
- **Devoluciones** — Devoluciones de ventas con reintegro de inventario
- **Reportes** — Ventas diarias/mensuales, utilidades, inventario y rendimiento de cajeros (PDF/Excel)
- **Tipo de cambio** — Consulta automática del tipo de cambio USD/MXN desde Banxico
- **Impresión de tickets** — Soporte para impresoras térmicas (ESC/POS) y virtuales (PDF) vía Print Bridge
- **Configuración** — Logo, cabecera, pie de página, colores, nombre de negocio y más
- **Multi-roles** — Administrador, Supervisor y Cajero con permisos diferenciados
- **Gift cards** — Emisión y cobro de tarjetas de regalo
- **Modo demo** — Datos de ejemplo para pruebas sin afectar producción

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│  Docker Compose                                         │
│                                                         │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────┐ │
│  │  Caddy   │──▶│   Frontend   │   │    Backend       │ │
│  │ (proxy)  │   │  Next.js 15  │──▶│   FastAPI        │ │
│  │  :80     │   │   :3000      │   │   Python 3.12    │ │
│  └──────────┘   └──────────────┘   └────────┬────────┘ │
│                                              │           │
│                                    ┌─────────▼────────┐ │
│                                    │   PostgreSQL 16   │ │
│                                    │   pos-db :5432    │ │
│                                    └──────────────────┘ │
└─────────────────────────────────────────────────────────┘

Print Bridge (Windows — fuera de Docker)
  └── Proceso Python local en puerto 9100
      Recibe peticiones del Backend e imprime en impresoras físicas o PDF
```

### Stack tecnológico

| Componente    | Tecnología                   | Versión           |
| ------------- | ---------------------------- | ----------------- |
| Backend       | FastAPI + SQLAlchemy (async) | Python 3.12       |
| Frontend      | Next.js App Router           | 15.x (standalone) |
| Base de datos | PostgreSQL                   | 16                |
| Proxy / SSL   | Caddy                        | 2.x               |
| Migraciones   | Alembic                      | 1.x               |
| Autenticación | JWT (HS256) + bcrypt         | —                 |
| Contenedores  | Docker Compose               | —                 |
| Print Bridge  | FastAPI + win32print / GDI   | Windows only      |

---

## 🚀 Instalación rápida

### Requisitos previos

- Docker Desktop (Windows/Mac/Linux)
- Git

### 1. Clonar el repositorio

```bash
git clone https://github.com/ardepa710/pos.git
cd pos
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los valores de tu negocio:

```env
# Contraseña inicial del administrador — cámbiala después del primer acceso
ADMIN_INITIAL_PASSWORD=TuPasswordSeguro123!

# Nombre de tu negocio (aparece en tickets y pantalla de login)
BUSINESS_NAME=Mi Tienda

# Tipo de negocio: general | restaurant | salon | clothing | electronics
BUSINESS_TYPE=general

# Llave JWT — genera una segura con: openssl rand -hex 32
SECRET_KEY=tu_clave_secreta_larga_y_aleatoria

# API de Banxico para tipo de cambio USD/MXN (opcional)
# Regístrate en: https://www.banxico.org.mx/SieAPIRest/service/v1/token
BANXICO_API_KEY=
```

### 3. Levantar el sistema

```bash
docker compose up -d
```

### 4. Acceder al sistema

Abrir en el navegador: **http://localhost**

- Usuario: `admin`
- Contraseña: la que configuraste en `ADMIN_INITIAL_PASSWORD`

> ⚠️ Cambia la contraseña del administrador después del primer acceso en **Configuración → Usuarios**.

---

## 🖨️ Print Bridge (impresión de tickets)

El Print Bridge es un proceso Python que corre en Windows (fuera de Docker) y se comunica con el backend para imprimir tickets en impresoras térmicas o virtuales (Microsoft Print to PDF).

### Instalación del Print Bridge

```bash
cd print_bridge

# Crear entorno virtual
python -m venv venv
venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar el bridge
python main.py
```

El bridge escucha en **http://localhost:9100** por defecto.

### Configurar la impresora en el sistema

1. Ir a **Configuración → Ticket**
2. En el campo **Impresora**, escribir el nombre exacto de la impresora de Windows
   - Para pruebas: `Microsoft Print to PDF`
   - Para impresora térmica: el nombre que aparece en el Panel de Control de Windows
3. Activar **Mostrar logo** si deseas que aparezca el logo de tu negocio

---

## 🗂️ Estructura del proyecto

```
pos/
├── backend/                    # API FastAPI
│   ├── app/
│   │   ├── main.py             # Punto de entrada, middleware CORS
│   │   ├── config.py           # Variables de entorno (pydantic-settings)
│   │   ├── database.py         # Sesión async SQLAlchemy
│   │   ├── models/             # Modelos ORM (SQLAlchemy)
│   │   ├── schemas/            # Schemas Pydantic (request/response)
│   │   ├── routers/            # Endpoints FastAPI por dominio
│   │   ├── services/           # Lógica de negocio
│   │   └── security/           # JWT, dependencias de auth
│   ├── alembic/                # Migraciones de base de datos
│   └── Dockerfile
│
├── frontend/                   # UI Next.js 15
│   ├── app/                    # App Router (layouts, pages)
│   ├── components/             # Componentes React
│   ├── lib/                    # Utilidades, cliente API, tipos
│   └── Dockerfile
│
├── print_bridge/               # Servidor de impresión Windows
│   ├── main.py                 # FastAPI + GDI + ESC/POS
│   └── requirements.txt
│
├── caddy/                      # Configuración del reverse proxy
│   └── Caddyfile
│
├── docs/
│   └── security/               # Reportes de auditoría de seguridad (PDF)
│
├── scripts/                    # Scripts de utilidad y generación de reportes
├── docker-compose.yml          # Orquestación de contenedores
├── .env.example                # Plantilla de variables de entorno
└── PLAN.md                     # Plan de desarrollo (v1.2 CONGELADO)
```

---

## 🔑 Roles y permisos

| Acción                    | Cajero | Supervisor | Administrador |
| ------------------------- | :----: | :--------: | :-----------: |
| Registrar ventas          |   ✅   |     ✅     |      ✅       |
| Abrir/cerrar caja         |   ✅   |     ✅     |      ✅       |
| Consultar clientes        |   ✅   |     ✅     |      ✅       |
| Ver reportes              |   ❌   |     ✅     |      ✅       |
| Anular ventas             |   ❌   |     ✅     |      ✅       |
| Gestionar catálogo        |   ❌   |     ❌     |      ✅       |
| Gestionar usuarios        |   ❌   |     ❌     |      ✅       |
| Configuración del negocio |   ❌   |     ❌     |      ✅       |
| Gestionar compras         |   ❌   |     ❌     |      ✅       |

---

## 📡 API

La documentación interactiva de la API está disponible en modo desarrollo:

- Swagger UI: **http://localhost/docs**
- ReDoc: **http://localhost/redoc**

> En producción (`ENV=production`) estos endpoints están desactivados por seguridad.

### Endpoints principales

| Grupo         | Prefijo             | Descripción                                     |
| ------------- | ------------------- | ----------------------------------------------- |
| Auth          | `/api/v1/auth`      | Login, refresh, cambio de contraseña            |
| Ventas        | `/api/v1/sales`     | Registro de ventas, sesiones de caja, impresión |
| Catálogo      | `/api/v1/catalog`   | Productos, categorías                           |
| Clientes      | `/api/v1/customers` | Clientes, lealtad                               |
| Compras       | `/api/v1/purchases` | Compras a proveedores                           |
| Reportes      | `/api/v1/reports`   | Ventas, utilidades, inventario (PDF/Excel)      |
| Configuración | `/api/v1/settings`  | Ajustes del negocio                             |
| Usuarios      | `/api/v1/users`     | Gestión de usuarios                             |
| Extras        | `/api/v1/extras`    | Gift cards, devoluciones, tipo de cambio        |

---

## ⚙️ Variables de entorno

| Variable                      | Requerida | Descripción                           | Default                     |
| ----------------------------- | :-------: | ------------------------------------- | --------------------------- |
| `DATABASE_URL`                |    ✅     | URL async de PostgreSQL               | —                           |
| `DATABASE_SYNC_URL`           |    ✅     | URL sync de PostgreSQL                | —                           |
| `SECRET_KEY`                  |    ✅     | Llave secreta para JWT                | —                           |
| `ADMIN_INITIAL_PASSWORD`      |    ✅     | Contraseña inicial del admin          | `Admin123!`                 |
| `BUSINESS_NAME`               |     —     | Nombre del negocio                    | `Mi Negocio`                |
| `BUSINESS_TYPE`               |     —     | Tipo de negocio                       | `general`                   |
| `CORS_ORIGINS`                |     —     | Orígenes permitidos CORS (JSON array) | `["http://localhost:3000"]` |
| `BANXICO_API_KEY`             |     —     | API key de Banxico para USD/MXN       | vacío                       |
| `PRINT_BRIDGE_URL`            |     —     | URL del Print Bridge                  | `http://localhost:9100`     |
| `PRINT_BRIDGE_ENABLED`        |     —     | Activar impresión                     | `false`                     |
| `ACCESS_TOKEN_EXPIRE_MINUTES` |     —     | Duración del token JWT                | `480`                       |
| `ENV`                         |     —     | Entorno: `development` / `production` | `development`               |
| `DEMO_MODE`                   |     —     | Activar modo demo                     | `false`                     |

---

## 🛠️ Desarrollo

### Levantar en modo desarrollo

```bash
# Todos los servicios
docker compose up -d

# Ver logs del backend
docker logs -f pos-backend

# Frontend con hot reload
cd frontend
npm install
npm run dev
```

### Ejecutar migraciones manualmente

```bash
docker exec pos-backend alembic upgrade head
```

### Crear una nueva migración

```bash
docker exec pos-backend alembic revision --autogenerate -m "descripcion del cambio"
```

### Ejecutar pruebas del backend

```bash
docker exec pos-backend pytest
```

---

## 🔒 Seguridad

- Contraseñas cifradas con **bcrypt** (passlib)
- Autenticación mediante **JWT HS256**
- Validación de entrada con **Pydantic** en todos los endpoints
- Consultas SQL parametrizadas (**SQLAlchemy**) — protección contra inyección SQL
- Roles RBAC estrictos en todos los endpoints protegidos
- Logs de auditoría para ventas, compras y devoluciones
- Contenedores Docker ejecutándose como usuario no-root

Para el reporte completo de auditoría de seguridad, ver [`docs/security/`](docs/security/).

---

## 📋 Historial de versiones

| Versión         | Fecha      | Descripción                                                                  |
| --------------- | ---------- | ---------------------------------------------------------------------------- |
| V2026.05.07-005 | 2026-05-07 | Logo en tickets, corrección error 1804 impresión PDF, validador cabecera/pie |
| V2026.05.07-001 | 2026-05-06 | Primera versión funcional completa                                           |

---

## 📄 Licencia

Proyecto personal — todos los derechos reservados.
