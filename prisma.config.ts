import "dotenv/config";
import { defineConfig } from "@prisma/config";
import mariadb from "mariadb";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
    adapter: () => {
      const pool = mariadb.createPool(process.env.DATABASE_URL!);
      return new PrismaMariaDb(pool);
    },
  },
});
