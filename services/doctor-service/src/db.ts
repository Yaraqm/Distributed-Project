import pg from "pg";
const { Pool } = pg;

export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "26258"),
  user: process.env.DB_USER || "root",
  database: process.env.DB_NAME || "hms",
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});
