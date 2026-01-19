import express from "express";
import cors from "cors";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import session from "express-session";

/* =========================
   Setup __dirname (ESM)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* =========================
   Middleware
========================= */
app.use(cors({
  origin: "http://localhost:3000", // update if using different frontend URL
  credentials: true
}));
app.use(express.json());

app.use(session({
  secret: "supersecretkey", // CHANGE THIS in production
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 1 day
}));

/* =========================
   Serve frontend
========================= */
app.use(express.static(path.join(__dirname, "../frontend")));

/* =========================
   Database connection
========================= */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

/* =========================
   Auth Middleware
========================= */
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Admin access only" });
  }
  next();
}

/* =========================
   Register
========================= */
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields required" });
    }

    // Check if email exists
    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING id, name, email, role`,
      [name, email, hash, "student"]
    );

    req.session.user = result.rows[0];

    res.json({ message: "Registered successfully", user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Registration failed" });
  }
});

/* =========================
   Login
========================= */
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);

    if (result.rows.length === 0) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };

    res.json({ message: "Logged in", user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

/* =========================
   Logout
========================= */
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ message: "Logged out" });
});

/* =========================
   Get current user
========================= */
app.get("/me", (req, res) => {
  if (!req.session.user) return res.json(null);
  res.json(req.session.user);
});

/* =========================
   Example protected route (admin only)
========================= */
app.get("/admin-data", requireAdmin, (req, res) => {
  res.json({ secret: "This is admin-only data" });
});