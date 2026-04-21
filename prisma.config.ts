import "dotenv/config";
import { defineConfig } from "@prisma/config";
import mariadb from "mariadb";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const databaseUrl = process.env.DATABASE_URL || "mysql://dummy:password@localhost:3306/dummy";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
    adapter: () => {
      const pool = mariadb.createPool(databaseUrl);
      return new PrismaMariaDb(pool);
    },
  },
});