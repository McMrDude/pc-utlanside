import express from "express";
import cors from "cors";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

/* ---------- RENTALS ---------- */

app.get("/rentals", async (req, res) => {
  const r = await pool.query(`
    SELECT rentals.*, pcs.pc_number, pcs.model
    FROM rentals
    JOIN pcs ON pcs.id = rentals.pc_id
    ORDER BY return_date
  `);
  res.json(r.rows);
});

app.post("/rentals", async (req, res) => {
  const { student_name, pc_id, rented_date, return_date } = req.body;

  await pool.query(`
    INSERT INTO rentals (student_name, pc_id, rented_date, return_date)
    VALUES ($1,$2,$3,$4)
  `, [student_name, pc_id, rented_date, return_date]);

  res.sendStatus(201);
});

app.delete("/rentals/:id", async (req, res) => {
  await pool.query("DELETE FROM rentals WHERE id=$1", [req.params.id]);
  res.sendStatus(204);
});

/* ---------- PCS ---------- */

app.get("/pcs", async (req, res) => {
  const r = await pool.query(`
    SELECT pcs.*,
    EXISTS (
      SELECT 1 FROM rentals
      WHERE rentals.pc_id = pcs.id
      AND rentals.return_date >= CURRENT_DATE
    ) AS rented
    FROM pcs
    ORDER BY pc_number
  `);
  res.json(r.rows);
});

app.post("/pcs", async (req, res) => {
  const { pc_number, model } = req.body;
  await pool.query(
    "INSERT INTO pcs (pc_number, model) VALUES ($1,$2)",
    [pc_number, model]
  );
  res.sendStatus(201);
});

app.listen(3000, () =>
  console.log("Server running on http://localhost:3000")
);