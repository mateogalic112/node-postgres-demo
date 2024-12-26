import pool from "config/database";
import bcrypt from "bcrypt";
import { initializeDatabase } from "./setup";
import { RegisterPayload } from "auth/auth.validation";
import { CreateProductPayload } from "products/products.validation";
import { faker } from "@faker-js/faker";

const users: RegisterPayload[] = Array.from({ length: 2 }, () => ({
  username: faker.internet.displayName(),
  email: faker.internet.email(),
  password: "123456"
}));

const products: CreateProductPayload[] = Array.from({ length: 2 }, () => ({
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: +faker.commerce.price({ min: 100, max: 10000, dec: 0 })
}));

export async function seedDatabase() {
  await initializeDatabase();

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Clear the users table
    await client.query("TRUNCATE TABLE users RESTART IDENTITY CASCADE");
    await client.query("TRUNCATE TABLE products RESTART IDENTITY CASCADE");

    for (const { username, email, password } of users) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query(`INSERT INTO users (username, email, password) VALUES ($1, $2, $3)`, [
        username,
        email,
        hashedPassword
      ]);
    }

    for (const { name, description, price } of products) {
      await client.query(`INSERT INTO products (name, description, price) VALUES ($1, $2, $3)`, [
        name,
        description,
        price
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
