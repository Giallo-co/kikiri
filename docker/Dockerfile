# Usamos una versión estable de Node
FROM node:20-slim

# Directorio de trabajo dentro del contenedor
WORKDIR /app

# Copiamos los archivos de configuración de npm
COPY package*.json ./

# Instalamos todas las dependencias
RUN npm install

# Copiamos el resto del código del proyecto
COPY . .

# Exponemos el puerto del backend
EXPOSE 5002

# Comando para ejecutar el servidor de TypeScript
CMD ["npx", "tsx", "server.ts"]