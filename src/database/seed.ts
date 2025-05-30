import pool from "database/pool";
import bcrypt from "bcrypt";
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
  price: +faker.commerce.price({ min: 1000, max: 100000, dec: 0 }),
  image_url: faker.image.url()
}));

export async function seedDatabase() {
  try {
    for (const { username, email, password } of users) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await pool.query(`INSERT INTO users (username, email, password) VALUES ($1, $2, $3)`, [
        username,
        email,
        hashedPassword
      ]);
    }

    for (const { name, description, price, image_url } of products) {
      await pool.query(
        `INSERT INTO products (name, description, price, image_url) VALUES ($1, $2, $3, $4)`,
        [name, description, price, image_url]
      );
    }
  } catch (error) {
    console.error("Database seeding failed:", error);
  }
}

// Execute the seeding function
seedDatabase()
  .then(() => {
    console.log("Database seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Database seeding failed:", error);
    process.exit(1);
  });
