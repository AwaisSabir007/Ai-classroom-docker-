import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/edusense" });

async function checkTables() {
  const client = await pool.connect();
  try {
    const res = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`);
    console.log("Existing tables:");
    res.rows.forEach(r => console.log("  -", r.tablename));
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables();
