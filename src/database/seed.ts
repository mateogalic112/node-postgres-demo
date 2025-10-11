import { Client } from "pg";
import bcrypt from "bcrypt";
import { RegisterPayload } from "auth/auth.validation";
import { CreateProductPayload } from "products/products.validation";
import { faker } from "@faker-js/faker";
import { env } from "config/env";
import { CreateRolePayload, RoleName } from "roles/roles.validation";
import { OpenAIService } from "services/openai";

const roles: Array<CreateRolePayload["body"]> = [
  {
    name: RoleName.ADMIN,
    description: "Administrator with full system access"
  },
  {
    name: RoleName.USER,
    description: "Regular user with standard permissions"
  }
];

const users: RegisterPayload[] = Array.from({ length: 2 }, () => ({
  username: faker.internet.displayName(),
  email: faker.internet.email(),
  password: "123456"
}));

const products: Array<CreateProductPayload["body"] & { image_url: string | null }> = [
  {
    name: "Quantum Pro Wireless Earbuds",
    description:
      "High-fidelity wireless earbuds with adaptive noise cancellation and 24-hour battery life.",
    price_in_cents: 12999,
    image_url: "https://loremflickr.com/640/480/technology?lock=1"
  },
  {
    name: "AstraBook X15 Laptop",
    description: "Ultra-light 15-inch laptop with an OLED display and next-gen Intel processor.",
    price_in_cents: 89999,
    image_url: "https://loremflickr.com/640/480/technology?lock=2"
  },
  {
    name: "PulseView 4K Monitor",
    description:
      "27-inch 4K UHD monitor with 144Hz refresh rate and HDR10 support for vivid color accuracy.",
    price_in_cents: 45999,
    image_url: "https://loremflickr.com/640/480/technology?lock=3"
  },
  {
    name: "NeoTrack Fitness Band",
    description:
      "Water-resistant fitness tracker with continuous heart-rate monitoring and sleep analytics.",
    price_in_cents: 7999,
    image_url: "https://loremflickr.com/640/480/technology?lock=4"
  },
  {
    name: "Vertex MX Mechanical Keyboard",
    description:
      "Compact RGB mechanical keyboard with hot-swappable switches and aluminum chassis.",
    price_in_cents: 14999,
    image_url: "https://loremflickr.com/640/480/technology?lock=5"
  },
  {
    name: "Auralis Noise-Canceling Headphones",
    description:
      "Over-ear Bluetooth headphones featuring adaptive noise cancellation and 40-hour playback.",
    price_in_cents: 24999,
    image_url: "https://loremflickr.com/640/480/technology?lock=6"
  },
  {
    name: "FluxCharge Pro Power Bank",
    description: "20,000mAh portable charger with fast USB-C PD output and wireless charging pad.",
    price_in_cents: 6999,
    image_url: "https://loremflickr.com/640/480/technology?lock=7"
  },
  {
    name: "LumaCam 360 Action Camera",
    description: "Waterproof 5.7K 360° camera with stabilization and live-streaming capability.",
    price_in_cents: 32999,
    image_url: "https://loremflickr.com/640/480/technology?lock=8"
  },
  {
    name: "Nimbus Smart Home Hub",
    description:
      "Centralized smart-home controller compatible with Alexa, Google, and Apple ecosystems.",
    price_in_cents: 17999,
    image_url: "https://loremflickr.com/640/480/technology?lock=9"
  },
  {
    name: "SolarEdge Mini Projector",
    description:
      "Pocket-sized 1080p projector with built-in battery and wireless screen mirroring.",
    price_in_cents: 26999,
    image_url: "https://loremflickr.com/640/480/technology?lock=10"
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

    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");

    // Insert roles
    for (const { name, description } of roles) {
      await client.query(`INSERT INTO roles (name, description) VALUES ($1, $2)`, [
        name,
        description
      ]);
    }

    const userRoleResult = await client.query("SELECT * FROM roles WHERE name = $1", [
      RoleName.USER
    ]);

    // Insert users
    for (const { username, email, password } of users) {
      const hashedPassword = await bcrypt.hash(password, 10);
      await client.query(
        `INSERT INTO users (username, email, password, role_id) VALUES ($1, $2, $3, $4)`,
        [username, email, hashedPassword, userRoleResult.rows[0].id]
      );
    }

    const user = await client.query("SELECT id FROM users WHERE email = $1", [users[0].email]);

    // Insert products
    for (const { name, description, image_url, price_in_cents } of products) {
      const result = await client.query(
        `INSERT INTO products (name, description, image_url, owner_id, price_in_cents) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [name, description, image_url, user.rows[0].id, price_in_cents]
      );
      const embeddings = await OpenAIService.getInstance().generateEmbeddings(description);
      await client.query(
        `INSERT INTO products_embeddings (product_id, embedding) VALUES ${embeddings.map((_, index) => `($1, $${index + 2}::vector)`).join(", ")}`,
        [result.rows[0].id, ...embeddings.map((embedding) => `[${embedding.join(",")}]`)]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    console.error("Database seeding failed:", error);
    await client.query("ROLLBACK");
  } finally {
    await client.end();
  }
}

// Execute the seeding function
seedDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch(() => {
    process.exit(1);
  });
