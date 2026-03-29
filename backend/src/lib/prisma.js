// ============================================
// Shared Prisma Client — Singleton Instance
// ============================================
// We use a single shared instance across the entire app
// to avoid creating multiple database connection pools.

const { PrismaClient } = require("@prisma/client");
const { Pool } = require("pg");
const { PrismaPg } = require("@prisma/adapter-pg");

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create Prisma client using the pg adapter
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

module.exports = prisma;
