import express from "express";
import cors from "cors";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcrypt";
import session from "express-session";
import { send } from "@emailjs/nodejs";
import crypto from "crypto";
import { request } from "http";


/* =========================
   Setup __dirname (ESM)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.urlencoded({ extended: true }));

/* =========================
   Middleware
========================= */
app.use(cors({
  origin: "http://localhost:3000", // adjust if your frontend is elsewhere
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
  ssl: {
    rejectUnauthorized: false
  }
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
   Example admin route
========================= */
app.get("/admin-data", requireAdmin, (req, res) => {
  res.json({ secret: "This is admin-only data" });
});

/* =========================
   Rentals
========================= */

app.delete("/rentals/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM rentals WHERE id = $1", [id]);
    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* =========================
   PCs
========================= */
app.get("/pcs", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM pcs ORDER BY pc_number");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PC fetch failed" });
  }
});

app.post("/pcs", async (req, res) => {
  try {
    const { pc_number, model } = req.body;
    await pool.query("INSERT INTO pcs (pc_number, model) VALUES ($1, $2)", [pc_number, model]);
    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PC insert failed" });
  }
});

app.get("/pcs/status", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        pcs.id,
        pcs.pc_number,
        pcs.model,
        CASE
          WHEN r.id IS NOT NULL THEN 'loaned'
          ELSE 'available'
        END AS status,
        u.name AS user_name,
        u.email AS user_email
      FROM pcs
      LEFT JOIN rentals r
        ON r.pc_number = pcs.pc_number
        AND r.return_date >= CURRENT_DATE
      LEFT JOIN users u
        ON u.id = r.user_id
      ORDER BY pcs.pc_number
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PC status fetch failed" });
  }
});

app.get("/requests", requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM requests ORDER BY requested_at DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch requests" });
  }
});

/* =========================
   Start server
========================= */
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

/* =========================
   Get rentals (role-based)
========================= */
app.get("/rentals", requireLogin, async (req, res) => {
  try {
    if (req.session.user.role === "admin") {
      const result = await pool.query(
        "SELECT * FROM rentals ORDER BY created_at DESC"
      );
      return res.json(result.rows);
    }

    const result = await pool.query(
      "SELECT * FROM rentals WHERE user_id = $1 ORDER BY created_at DESC",
      [req.session.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

app.post("/rentals", requireLogin, async (req, res) => {
  try {
    const request = await pool.query("SELECT * FROM requests WHERE user_id = $1", 
    [req.session.user.id]);

    await pool.query(
      `INSERT INTO rentals (student_name, pc_number, rented_date, return_date, user_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [  
        req.session.user.name,
        123,
        request.start_date,
        request.return_date,
        req.session.user.id
      ]
    );

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert failed" });
  }
});

app.get("/availability", async (req, res) => {
  try {
    const totalPCs = await pool.query("SELECT COUNT(*) FROM pcs");

    const loaned = await pool.query(`
      SELECT COUNT(DISTINCT pc_number)
      FROM rentals
      WHERE return_date >= CURRENT_DATE
    `);

    const available =
      Number(totalPCs.rows[0].count) -
      Number(loaned.rows[0].count);

    const nextReturn = await pool.query(`
      SELECT MIN(return_date) AS next_date
      FROM rentals
      WHERE return_date >= CURRENT_DATE
    `);

    res.json({
      available,
      nextAvailableDate: nextReturn.rows[0].next_date
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Availability check failed" });
  }
});

app.post("/request-loan", requireLogin, async (req, res) => {
  try {
    const popup = document.getElementById("requestPopup");
    popup.style.display = "block";

    // Find free PC
    const pcRes = await pool.query(`
      SELECT pc_number FROM pcs
      WHERE pc_number NOT IN (
        SELECT pc_number FROM rentals
        WHERE return_date >= CURRENT_DATE
      )
      ORDER BY pc_number
      LIMIT 1
    `);

    if (pcRes.rows.length === 0) {
      return res.json({ available: false });
    }

    const pcNumber = pcRes.rows[0].pc_number;

    const today = new Date();
    let startDate = new Date(today);

    // Pickup logic
    const day = today.getDay(); // 0=Sun, 5=Fri
    const hour = today.getHours();

    if (day === 6 || day === 0 || (day === 5 && hour >= 12)) {
      // Weekend or Fri after 12 → Monday
      startDate.setDate(startDate.getDate() + ((8 - day) % 7));
    } else if (hour >= 12) {
      startDate.setDate(startDate.getDate() + 1);
    }

    startDate.setHours(0, 0, 0, 0);

    const returnDate = new Date(startDate);
    returnDate.setDate(returnDate.getDate() + 6);

    await pool.query(`
      INSERT INTO rentals
      (student_name, pc_number, rented_date, return_date, user_id)
      VALUES ($1, $2, $3, $4, $5)
    `, [
      req.session.user.name,
      pcNumber,
      startDate,
      returnDate,
      req.session.user.id
    ]);

    res.json({
      available: true,
      pcNumber,
      pickupDate: startDate,
      returnDate
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Loan request failed" });
  }
});

app.post("/submit-date", requireLogin, async (req, res) => {
  try {
    const { selectedDate, returnDate } = req.body;
    const user = req.session.user;

    console.log(selectedDate, returnDate);

    const token = crypto.randomBytes(32).toString("hex");
    const status = "pending";

    await send(
      process.env.EMAILJS_SERVICE_ID,
      process.env.EMAILJS_TEMPLATE_ID,
      {
        selected_date: selectedDate,
        return_date: returnDate,
        student_name: req.session.user.name,
        student_email: req.session.user.email
      },
      {
        publicKey: process.env.EMAILJS_PUBLIC_KEY
      }
    );

    await pool.query(
      `INSERT INTO requests 
       (user_id, student_name, student_email, status, token, start_date, return_date, requested_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING *`,
      [
        user.id,
        user.name,
        user.email,
        status,
        token,
        selectedDate,
        returnDate
      ]
    );
  } catch (err) {
    console.error(err);
    res.status(500).send("Error sending email");
  }
});

app.post("/submit-changes", requireAdmin, async (req, res) => {
  try {
    const { id, pc_number, model } = req.body;

    const result = await pool.query(`
      UPDATE pcs
      SET pc_number = $1,
          model = $2
      WHERE id = $3
      RETURNING *
    `, [pc_number, model, id]);

    console.log("Updated rows:", result.rowCount);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});