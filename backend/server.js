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

app.get("/rentals", async (req, res) => {
  const r = await pool.query("SELECT * FROM rentals ORDER BY created_at DESC");
  res.json(r.rows);
});

app.post("/rentals", async (req, res) => {
  const { student_name, pc_number, rented_date, return_date } = req.body;
  await pool.query(
    "INSERT INTO rentals (student_name, pc_number, rented_date, return_date) VALUES ($1,$2,$3,$4)",
    [student_name, pc_number, rented_date, return_date]
  );
  res.sendStatus(201);
});

app.delete("/rentals/:id", async (req, res) => {
  await pool.query("DELETE FROM rentals WHERE id=$1", [req.params.id]);
  res.sendStatus(204);
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));