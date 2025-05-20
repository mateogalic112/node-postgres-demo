import pool from "config/database";

export async function createTables() {
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

  // Price is in cents to avoid floating point arithmetic issues
  await pool.query(`
        CREATE TABLE IF NOT EXISTS products (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100),
          description TEXT,
          price INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
    `);
}

// Run the table creation and seeding process
export const initializeDatabase = async () => {
  if (process.env.NODE_ENV === "test") return;

  try {
    await createTables();
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};
