import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import dotenv from 'dotenv';

dotenv.config();

// Extraemos las partes individuales de la URL de conexión
const dbUrl = new URL(process.env.DATABASE_URL as string);

// Configuramos el driver adaptador
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port, 10) || 3306,
  user: dbUrl.username,
  password: dbUrl.password,
  database: dbUrl.pathname.slice(1), // slice(1) quita el '/' inicial
});

// Inicializamos el cliente pasándole el adaptador
const prisma = new PrismaClient({ adapter });

export default prisma;