#!/bin/bash
# POS — Install script (Linux / macOS)
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}=== POS — Instalación ===${NC}"

# Generate .env if not present
if [ ! -f .env ]; then
    echo "Generando .env desde .env.example..."
    cp .env.example .env

    # Generate random secrets
    DB_PASSWORD=$(openssl rand -hex 24)
    JWT_SECRET=$(openssl rand -hex 32)
    ADMIN_PASS=$(openssl rand -hex 12)

    sed -i "s/pos_password/$DB_PASSWORD/g" .env
    sed -i "s/CHANGE_ME_32_CHARS_MINIMUM_RANDOM_STRING/$JWT_SECRET/g" .env

    echo -e "${YELLOW}Contraseña admin inicial: $ADMIN_PASS${NC}"
    echo "ADMIN_INITIAL_PASSWORD=$ADMIN_PASS" >> .env
fi

# Ask business name
read -p "Nombre del negocio: " BUSINESS_NAME
sed -i "s/Mi Negocio/$BUSINESS_NAME/g" .env

# Start
echo "Iniciando contenedores..."
docker compose up -d --build

echo "Esperando que los servicios estén listos..."
sleep 10

# Health check
until curl -sf http://localhost/health > /dev/null 2>&1; do
    echo "Esperando backend..."
    sleep 3
done

echo -e "${GREEN}✅ POS listo en http://localhost${NC}"
echo -e "${GREEN}   Usuario: admin${NC}"
echo -e "${YELLOW}   Contraseña: (ver .env → ADMIN_INITIAL_PASSWORD)${NC}"
