import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://root@localhost:26257/defaultdb?sslmode=disable",
  ssl: false, // ✅ disable SSL when CockroachDB runs with --insecure
});
