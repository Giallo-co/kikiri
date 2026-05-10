# Kikiri Music Player

Este proyecto ha sido separado en Frontend y Backend.

## Estructura del Proyecto

- `frontend/`: Aplicación React + Vite.
- `backend/`: Servidor Express + DynamoDB.

## Cómo empezar

1.  **Instalar dependencias:**
    Desde la raíz, ejecuta:
    ```bash
    npm run install:all
    ```
    (Esto instalará las dependencias en la raíz, frontend y backend).

2.  **Iniciar servicios de infraestructura (Docker):**
    Asegúrate de tener Docker corriendo y ejecuta:
    ```bash
    npm run docker:up
    ```
    Esto levantará DynamoDB y Minio.

3.  **Poblar la base de datos (Seed):**
    ```bash
    npm run seed
    ```

4.  **Iniciar el proyecto en modo desarrollo:**
    ```bash
    npm run dev
    ```
    Esto iniciará tanto el frontend (puerto 3000) como el backend (puerto 5002) simultáneamente.

## Endpoints del Backend

El backend corre en `http://localhost:5002` y el frontend tiene un proxy configurado para redirigir las peticiones `/api` al backend.

- `GET /api/nodes`: Obtiene todos los nodos.
- `GET /api/nodes/stream`: Stream SSE para actualizaciones en tiempo real.
- `POST /api/register`: Registra un nuevo usuario.
- `POST /api/node-selected`: Notifica la selección de un nodo.
- `POST /api/like`: Toggle like en una canción.
- `POST /api/album/upload`: Sube un nuevo álbum.
