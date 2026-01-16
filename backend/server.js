import express from "express";
import cors from "cors";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

/* =========================
   Setup __dirname (ESM)
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* =========================
   Middleware
========================= */
app.use(cors());
app.use(express.json());

/* =========================
   Serve frontend
========================= */
app.use(express.static(path.join(__dirname, "../frontend")));

/* =========================
   Database connection
========================= */
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

/* =========================
   Test route
========================= */
app.get("/", (req, res) => {
  res.send("PC Rental API is running");
});

/* =========================
   Get all rentals
========================= */
app.get("/rentals", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM rentals ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/* =========================
   Add a rental
========================= */
app.post("/rentals", async (req, res) => {
  try {
    const {
      student_name,
      pc_number,
      rented_date,
      return_date
    } = req.body;

    await pool.query(
      `
      INSERT INTO rentals
        (student_name, pc_number, rented_date, return_date)
      VALUES
        ($1, $2, $3, $4)
      `,
      [student_name, pc_number, rented_date, return_date]
    );

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert failed" });
  }
});

/* =========================
   Delete a rental
========================= */
app.delete("/rentals/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await pool.query(
      "DELETE FROM rentals WHERE id = $1",
      [id]
    );

    res.sendStatus(204);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

/* =========================
   Get all PCs
========================= */
app.get("/pcs", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM pcs ORDER BY pc_number"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PC fetch failed" });
  }
});

/* =========================
   Add PC
========================= */
app.post("/pcs", async (req, res) => {
  try {
    const { pc_number, model } = req.body;

    await pool.query(
      "INSERT INTO pcs (pc_number, model) VALUES ($1, $2)",
      [pc_number, model]
    );

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PC insert failed" });
  }
});

/* =========================
   Get PCs with status
========================= */
app.get("/pcs/status", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pcs.id,
        pcs.pc_number,
        pcs.model,
        CASE
          WHEN EXISTS (
            SELECT 1 FROM rentals
            WHERE rentals.pc_number = pcs.pc_number
            AND rentals.return_date >= CURRENT_DATE
          )
          THEN 'loaned'
          ELSE 'available'
        END AS status
      FROM pcs
      ORDER BY pcs.pc_number
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "PC status fetch failed" });
  }
});

/* =========================
   Start server
========================= */
const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});