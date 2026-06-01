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
import connectPgSimple from "connect-pg-simple";

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

const PgSession = connectPgSimple(session);

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: "session",
    pruneSessionInterval: 60 * 60 // prune expired sessions every hour
  }),
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
    const { name, email, phone, password, password_again } = req.body;

    if (!name || !email || !phone || !password || !password_again) {
      return res.status(400).json({ error: "Fyll inn alle feltene" });
    }

    if (password !== password_again) {
      return res.status(400).json({ error: "Passordene passer ikke" });
    }

    const exists = await pool.query("SELECT id FROM users WHERE email=$1", [email]);
    if (exists.rows.length > 0) {
      return res.status(400).json({ error: "Mail er allerede i bruk" });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (name, email, telefonnummer, password_hash, role, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       RETURNING id, name, email, role`,
      [name, email, phone, hash, "student"]
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


/* ==========================
    Health check
========================== */
app.get("/health", (req, res) => {
  res.sendStatus(200);
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
    const { pc_number, serie_number, model } = req.body;
    await pool.query("INSERT INTO pcs (pc_number, serie_nummer, model) VALUES ($1, $2, $3)", [pc_number, serie_number, model]);
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
        pcs.serie_nummer,
        pcs.model,
        pcs.status,
        u.name AS user_name,
        u.email AS user_email

      FROM pcs

      LEFT JOIN rentals r
        ON r.pc_number = pcs.pc_number
        AND r.status = 'active'

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

app.get("/requests", async (req, res) => {
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
app.get("/rentals-admin", requireLogin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM rentals ORDER BY created_at DESC",
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});
app.get("/rentals-front", requireLogin, async (req, res) => {
  try {
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
    const results = await pool.query("SELECT * FROM requests WHERE id = $1", 
    [req.body.requestId]);
    const reqData = results.rows[0];

    const updatePC = await pool.query(
      `UPDATE pcs
       SET status = 'lånt'
       WHERE pc_number = $1`,
      [req.body.pcNumber]
    );

    await pool.query(
      `INSERT INTO rentals (student_name, student_email, pc_number, rented_date, return_date, user_id, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [  
        reqData.student_name,
        reqData.student_email,
        req.body.pcNumber,
        reqData.start_date,
        reqData.return_date,
        reqData.user_id
      ]
    );

    await pool.query(
      `DELETE FROM requests WHERE id = $1`,
      [req.body.requestId]
    );

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert failed" });
  }
});
app.post("/request-decline", requireLogin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE requests SET status = 'declined' WHERE id = $1`,
      [req.body.requestId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});
app.post("/remove-request", requireLogin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE requests SET notice_decline = 'true' WHERE id = $1`,
      [req.body.id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});
app.post("/kill-the-neighbors-dog", requireLogin, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM requests WHERE id = $1`,
      [req.body.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

app.post("/return", requireLogin, async (req, res) => {
  try {
    const { id, pcNumber } = req.body;

    await pool.query(
      `UPDATE rentals
       SET status = 'returned'
       WHERE id = $1`,
      [id]
    );

    const updatePC = await pool.query(
      `UPDATE pcs
       SET status = 'ledig'
       WHERE pc_number = $1`,
      [pcNumber]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Return failed" });
  }
});

app.get("/availability", async (req, res) => {
  try {
    const totalPCs = await pool.query("SELECT COUNT(*) FROM pcs");

    const loaned = await pool.query(`
      SELECT COUNT(*) FROM pcs
      WHERE status = 'lånt'
    `);

    const available =
      Number(totalPCs.rows[0].count) -
      Number(loaned.rows[0].count);

    const nextReturn = await pool.query(`
      SELECT MIN(return_date) AS next_date
      FROM rentals
      WHERE return_date >= CURRENT_DATE AND status = 'active'
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

    console.log("BODY:", req.body);

    // CHECK VALUES
    if (!selectedDate || !returnDate) {
      return res.status(400).json({
        error: "Dates missing"
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const status = "pending";

    // TRY EMAIL BUT DON'T CRASH
    try {
      await send(
        process.env.EMAILJS_SERVICE_ID,
        process.env.EMAILJS_TEMPLATE_ID,
        {
          selected_date: selectedDate,
          return_date: returnDate,
          student_name: user.name,
          student_email: user.email
        },
        {
          publicKey: process.env.EMAILJS_PUBLIC_KEY
        }
      );

      console.log("Email sent");
    } catch (emailErr) {
      console.error("EMAIL ERROR:", emailErr);
    }

    // ALWAYS INSERT INTO DATABASE
    const result = await pool.query(
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

    console.log("REQUEST SAVED:", result.rows[0]);

    res.json({
      success: true
    });

  } catch (err) {
    console.error("SUBMIT ERROR:", err);

    res.status(500).json({
      error: err.message
    });
  }
});

app.post("/submit-changes", requireAdmin, async (req, res) => {
  try {
    const { id, pc_number, serie_number, model } = req.body;

    const rentalUpdate = await pool.query(`
      UPDATE rentals
      SET pc_number = $1
      WHERE pc_number = (SELECT pc_number FROM pcs WHERE id = $2)
        AND status = 'active'
    `, [pc_number, id]);

    const result = await pool.query(`
      UPDATE pcs
      SET pc_number = $1,
          serie_nummer = $2,
          model = $3
      WHERE id = $4
      RETURNING *
    `, [pc_number, serie_number, model, id]);

    console.log("Updated rows:", result.rowCount);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Update failed" });
  }
});


/* PASSORD RESET FORESPØRSEL */
app.post("/request-reset", async (req, res) => {
  try {
    const { email } = req.body;

    const result = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );

    if (result.rows.length === 0) {
      return res.json({ message: "Hvis en passende konto finnes så har det blitt sendt en mail." });
    }

    const userId = result.rows[0].id;
    const token = crypto.randomBytes(32).toString("hex");

    // delete old tokens for this user
    await pool.query(
      "DELETE FROM password_resets WHERE user_id = $1",
      [userId]
    );

    // insert new one
    await pool.query(
      `INSERT INTO password_resets (user_id, token, expires_at)
      VALUES ($1, $2, NOW() + INTERVAL '1 hour')`,
      [userId, token]
    );

    const resetLink = `https://pc-utlanside.onrender.com/reset-password/${token}`;

    console.log("EMAILJS_SERVICE_ID:", process.env.EMAILJS_SERVICE_ID);
    console.log("EMAILJS_PASSWORDRESET_ID:", process.env.EMAILJS_PASSWORDRESET_ID);
    console.log("EMAILJS_PUBLIC_KEY:", process.env.EMAILJS_PUBLIC_KEY);
    console.log("Template Params:", { reset_link: resetLink, to_email: email });
    try {
      const response = await send(
        process.env.EMAILJS_SERVICE_ID,
        process.env.EMAILJS_PASSWORDRESET_ID,
        {
          reset_link: resetLink,
          to_email: email
        },
        {
          publicKey: process.env.EMAILJS_PUBLIC_KEY
        }
      );
      console.log("EmailJS response:", response);
    } catch (err) {
      console.error("EmailJS send error:", JSON.stringify(err, null, 2));
      return res.status(500).json({ message: "Klarte ikke å sende e-post" });
    }

    res.json({ message: "Hvis en passende konto finnes så har det blitt sendt en mail." });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

/* RESET PASSORD */
app.post("/reset-password", async (req,res) => {
  const { token, newPassword } = req.body;

  const result = await pool.query(
    `SELECT * FROM password_resets
    WHERE token = $1 AND expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return res.status(400).json({ error: "Ugyldig eller utløpt reset" });
  }

  const userId = result.rows[0].user_id;

  const hash = await bcrypt.hash(newPassword, 10);

  await pool.query(
    "UPDATE users SET password_hash=$1 WHERE id=$2",
    [hash, userId]
  );

  await pool.query(
    "DELETE FROM password_resets WHERE token = $1",
    [token]
  );

  res.json({ message: "Passord reset vellykket" });
});

setInterval(async () => {
  try {
    const result = await pool.query(
      "DELETE FROM password_resets WHERE expires_at < NOW()"
    );
    console.log(`🧹 Slettet ${result.rowCount} utløpte tokens`);
  } catch (err) {
    console.error("Cleanup error:", err);
  }
}, 1000 * 60 * 10); // every 10 minutes