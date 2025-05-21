import pool from "config/database";
import bcrypt from "bcrypt";
import { clearAllTables, createTables } from "./setup";
import { RegisterPayload } from "auth/auth.validation";
import { CreateProductPayload } from "products/products.validation";
import { faker } from "@faker-js/faker";

const users: RegisterPayload[] = Array.from({ length: 2 }, () => ({
  username: faker.internet.displayName(),
  email: faker.internet.email(),
  password: "123456"
}));

const products: CreateProductPayload[] = Array.from({ length: 200 }, () => ({
  name: faker.commerce.productName(),
  description: faker.commerce.productDescription(),
  price: +faker.commerce.price({ min: 100, max: 10000, dec: 0 })
}));

export async function seedDatabase() {
  try {
    await createTables();

    // @dev clear all tables before seeding
    await clearAllTables();

    for (const { username, email, password } of users) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(`INSERT INTO users (username, email, password) VALUES ($1, $2, $3)`, [
        username,
        email,
        hashedPassword
      ]);
    }

    for (const { name, description, price } of products) {
      await pool.query(`INSERT INTO products (name, description, price) VALUES ($1, $2, $3)`, [
        name,
        description,
        price
      ]);
    }
  } catch (error) {
    console.error("Database seeding failed:", error);
  }
}
