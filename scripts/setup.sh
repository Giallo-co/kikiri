#!/bin/bash

# Salir inmediatamente si algun comando falla
set -e

echo "Verificando variables de entorno..."
if [ ! -f .env ]; then
  echo "Creando .env a partir de .env.example..."
  cp .env.example .env
fi

if [ ! -f frontend/.env ] && [ -f frontend/.env.example ]; then
  echo "Creando frontend/.env a partir de .env.example..."
  cp frontend/.env.example frontend/.env
fi

echo "Generando cliente de Prisma..."
npx prisma generate

echo "Aplicando migraciones a la base de datos RDS..."
npx prisma migrate deploy

echo "Entorno listo."