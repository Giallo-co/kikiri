import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config(); // Asegúrate de llamar a esto primero
const prisma = new PrismaClient();
export default prisma;