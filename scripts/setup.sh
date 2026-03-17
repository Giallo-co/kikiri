#!/bin/bash

# Salir inmediatamente si algún comando falla
set -e

echo "Verificando variables de entorno..."
if [ ! -f backend/.env ]; then
  echo "Creando backend/.env a partir de .env.example..."
  cp backend/.env.example backend/.env
fi

if [ ! -f frontend/.env ] && [ -f frontend/.env.example ]; then
  echo "Creando frontend/.env a partir de .env.example..."
  cp frontend/.env.example frontend/.env
fi

echo "Levantando la base de datos con Docker..."
cd backend/docker
docker compose up -d
cd ../..

echo "Esperando a que la base de datos esté lista (10s)..."
sleep 10

echo "Generando cliente de Prisma..."
cd backend
npx prisma generate
npx prisma db push --force-reset
cd ..

echo "Entorno listo."