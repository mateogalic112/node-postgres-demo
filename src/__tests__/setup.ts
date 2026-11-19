import { faker } from "@faker-js/faker";
import bcrypt from "bcrypt";
import App from "app";
import { createApp } from "app.factory";
import { Auction } from "auctions/auctions.validation";
import { RoleName } from "roles/roles.validation";
import { LoggerService } from "services/logger.service";
import { PostgresService } from "services/postgres.service";
import request from "supertest";
import { embeddingService, filesService, mailService, paymentsService } from "./mocks";

export const db = PostgresService.getInstance();

const ADMIN_USER = {
  username: "admin",
  email: "admin@example.com",
  password: "password"
};

export const createTestApp = () =>
  createApp({
    db,
    files: filesService,
    embeddings: embeddingService,
    mail: mailService,
    payments: paymentsService,
    logger: LoggerService.getInstance()
  });

export const registerUserRequest = async (app: App, username: string) => {
  return request(app.getServer())
    .post("/api/v1/auth/register")
    .send({
      username,
      email: `${username}@example.com`,
      password: "password"
    });
};

export const getAuthCookieAfterRegister = async (app: App, username: string) => {
  const userResponse = await registerUserRequest(app, username);
  return userResponse.headers["set-cookie"][0];
};

export const createProductRequest = async (app: App, authCookie: string) => {
  return request(app.getServer())
    .post("/api/v1/products")
    .set("Cookie", authCookie)
    .field("name", faker.commerce.productName())
    .field("description", faker.commerce.productDescription())
    .field("price_in_cents", faker.number.int({ min: 100, max: 100000 }));
};

export const getAdminAuthCookie = async (app: App) => {
  // Admins can't be created through the API; low bcrypt cost keeps this fast.
  const hashedPassword = await bcrypt.hash(ADMIN_USER.password, 4);
  await db.query(
    `INSERT INTO users (username, email, password, role_id)
     SELECT $1, $2, $3, id FROM roles WHERE name = $4`,
    [ADMIN_USER.username, ADMIN_USER.email, hashedPassword, RoleName.ADMIN]
  );

  const response = await request(app.getServer())
    .post("/api/v1/auth/login")
    .send({ email: ADMIN_USER.email, password: ADMIN_USER.password });
  return response.headers["set-cookie"][0];
};

export const createActiveAuction = async (creatorId: number, productId: number) => {
  const result = await db.query<Auction>(
    `INSERT INTO auctions (product_id, creator_id, start_time, duration_hours, starting_price_in_cents, created_at)
     VALUES ($1, $2, NOW() - INTERVAL '1 hour', $3, $4, NOW() - INTERVAL '2 hours') RETURNING *`,
    [productId, creatorId, 48, 1000]
  );
  return result.rows[0];
};

export const seedProducts = async (count: number, ownerId: number) => {
  const values: unknown[] = [];
  const rows: string[] = [];
  for (let i = 0; i < count; i++) {
    const offset = i * 4;
    rows.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`);
    values.push(
      faker.commerce.productName(),
      faker.commerce.productDescription(),
      faker.number.int({ min: 100, max: 100000 }),
      ownerId
    );
  }

  const result = await db.query<{ id: number }>(
    `INSERT INTO products (name, description, price_in_cents, owner_id)
     VALUES ${rows.join(", ")}
     RETURNING id`,
    values
  );
  return result.rows;
};
