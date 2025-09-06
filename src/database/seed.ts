import { Client } from "pg";
import bcrypt from "bcrypt";
import { RegisterPayload } from "auth/auth.validation";
import { CreateProductPayload } from "products/products.validation";
import { faker } from "@faker-js/faker";
import { env } from "config/env";
import { CreateRolePayload } from "roles/roles.validation";

const users: RegisterPayload[] = Array.from({ length: 2 }, () => ({
  username: faker.internet.displayName(),
  email: faker.internet.email(),
  password: "123456"
}));

const products: Array<CreateProductPayload["body"] & { image_url: string | null }> = Array.from(
  { length: 100 },
  () => ({
    name: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    price: +faker.commerce.price({ min: 1000, max: 100000, dec: 0 }),
    image_url: faker.image.url()
  })
);

const roles: Array<CreateRolePayload["body"]> = [
  {
    name: "admin",
    description: "Administrator with full system access"
  },
  {
    name: "user",
    description: "Regular user with standard permissions"
  }
];

export async function seedDatabase() {
  const client = new Client({
    host: env.POSTGRES_HOST,
    user: env.POSTGRES_USER,
    password: env.POSTGRES_PASSWORD,
    database: env.POSTGRES_DB,
    port: env.POSTGRES_PORT
  });

  try {
    await client.connect();

    for (const { username, email, password } of users) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query(`INSERT INTO users (username, email, password) VALUES ($1, $2, $3)`, [
        username,
        email,
        hashedPassword
      ]);
    }

    const user = await client.query("SELECT id FROM users WHERE email = $1", [users[0].email]);

    for (const { name, description, image_url } of products) {
      await client.query(
        `INSERT INTO products (name, description, image_url, owner_id) VALUES ($1, $2, $3, $4)`,
        [name, description, image_url, user.rows[0].id]
      );
    }

    for (const { name, description } of roles) {
      await client.query(`INSERT INTO roles (name, description) VALUES ($1, $2)`, [
        name,
        description
      ]);
    }
  } catch (error) {
    console.error("Database seeding failed:", error);
  } finally {
    await client.end();
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
