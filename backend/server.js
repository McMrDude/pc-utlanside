import express from "express";
import cors from "cors";
import pg from "pg";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend files
app.use(express.static(path.join(__dirname, "../frontend")));

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Test route
app.get("/", (req, res) => {
  res.send("PC Rental API is running");
});

// Get all rentals
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

// Add a rental
app.post("/rentals", async (req, res) => {
  try {
    const { student_name, pc_number, rented_date, return_date } = req.body;

    await pool.query(
      `INSERT INTO rentals
       (student_name, pc_number, rented_date, return_date)
       VALUES ($1, $2, $3, $4)`,
      [student_name, pc_number, rented_date, return_date]
    );

    res.sendStatus(201);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Insert failed" });
  }
});

// Delete a rental
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

app.get("/pcs", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM pcs ORDER BY pc_number"
  );
  res.json(result.rows);
});

app.get("/pcs/available", async (req, res) => {
  const result = await pool.query(`
    SELECT p.*
    FROM pcs p
    WHERE p.id NOT IN (
      SELECT pc_id FROM rentals
    )
    ORDER BY p.pc_number
  `);
  res.json(result.rows);
});

app.post("/pcs", async (req, res) => {
  const { pc_number, model } = req.body;

  await pool.query(
    "INSERT INTO pcs (pc_number, model) VALUES ($1, $2)",
    [pc_number, model]
  );

  res.sendStatus(201);
});

// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});