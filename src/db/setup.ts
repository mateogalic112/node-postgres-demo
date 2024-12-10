import pool from "config/database";

async function createTables() {
  await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(100),
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
      `);
}

// Run the table creation and seeding process
export const initializeDatabase = async () => {
  try {
    await createTables();
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};
