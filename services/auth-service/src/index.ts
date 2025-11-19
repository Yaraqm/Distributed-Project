import express from "express";
import "dotenv/config";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { Pool } from "pg";

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ==========================
// ROLE CONSTANTS
// ==========================
const ROLES = ["admin", "doctor", "lab", "pharmacy"];

// ==========================
// HEALTH
// ==========================
app.get("/health", (_req, res) => res.json({ ok: true, service: "auth" }));

// ==========================
// SELF-REGISTER
// ==========================
app.post("/auth/register", async (req, res) => {
  const { email, password, role } = req.body;

  if (!ROLES.includes(role)) {
    return res.status(400).json({ error: "invalid_role" });
  }

  const hash = await bcrypt.hash(password, 10);

  await pool.query(
    `INSERT INTO users (email, password_hash, role)
     VALUES ($1,$2,$3)`,
    [email, hash, role]
  );

  res.json({ ok: true, message: "User created" });
});

// ==========================
// LOGIN
// ==========================
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query("SELECT * FROM users WHERE email = $1", [
    email,
  ]);

  if (result.rows.length === 0)
    return res.status(401).json({ error: "Invalid credentials" });

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);

  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: "8h" }
  );

  res.json({ token });
});

// ==========================
// WHO AM I
// ==========================
app.get("/auth/me", (req, res) => {
  const auth = req.headers.authorization?.split(" ")[1];
  if (!auth) return res.status(401).json({ error: "no_token" });

  try {
    const decoded = jwt.verify(auth, process.env.JWT_SECRET!);
    res.json(decoded);
  } catch {
    res.status(401).json({ error: "invalid_token" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`auth-service 🔐 running on ${PORT}`));
