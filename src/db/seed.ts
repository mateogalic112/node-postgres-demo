import pool from "config/database";
import bcrypt from "bcrypt";
import { initializeDatabase } from "./setup";

const seedData = [
  {
    username: "Mateo",
    email: "mateo@gmail.com",
    password: "123456"
  }
];

export async function seedDatabase() {
  await initializeDatabase();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clear the users table
    await client.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE");

    for (const { username, email, password } of seedData) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query(`INSERT INTO users (username, email, password) VALUES ($1, $2, $3)`, [
        username,
        email,
        hashedPassword
      ]);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

seedDatabase()
  .then(() => console.log("Database seeded successfully"))
  .catch((error) => console.error("Database seeding failed:", error))
  .finally(() => pool.end());
