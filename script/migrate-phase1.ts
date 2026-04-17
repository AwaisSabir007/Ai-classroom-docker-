import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/edusense" });

async function migrate() {
  const client = await pool.connect();
  try {
    // Create attendances table if it doesn't exist
    console.log("Creating attendances table...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS attendances (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR NOT NULL,
        student_id VARCHAR NOT NULL,
        is_present BOOLEAN NOT NULL DEFAULT false,
        is_attended BOOLEAN NOT NULL DEFAULT false,
        average_focus REAL DEFAULT 0,
        timestamp TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("✅ attendances table ready");
    
    // Add source_type column to quizzes
    console.log("Adding source_type column to quizzes...");
    await client.query(`ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'manual'`);
    console.log("✅ source_type column added to quizzes");
    
    console.log("\n🎉 Phase 1 migration complete!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
