import { faker } from "@faker-js/faker";
import App from "app";
import { createApp } from "app.factory";
import { Auction } from "auctions/auctions.validation";
import { PostgresService } from "services/postgres.service";
import request from "supertest";
import {
  embeddingsService,
  eventBus,
  filesService,
  logger,
  mailService,
  paymentsService
} from "./mocks";

export const db = PostgresService.getInstance();

export const createTestApp = () =>
  createApp({
    db,
    filesService: filesService,
    embeddingsService: embeddingsService,
    mailService: mailService,
    paymentsService: paymentsService,
    logger,
    eventBus
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

export const createActiveAuction = async (creatorId: number, productId: number) => {
  const result = await db.query<Auction>(
    `INSERT INTO auctions (product_id, creator_id, start_time, duration_hours, starting_price_in_cents, created_at)
     VALUES ($1, $2, NOW() - INTERVAL '1 hour', $3, $4, NOW() - INTERVAL '2 hours') RETURNING *`,
    [productId, creatorId, 48, 1000]
  );
  return result.rows[0];
};
