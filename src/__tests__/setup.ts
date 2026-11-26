import { faker } from "@faker-js/faker";
import { createApp } from "app.factory";
import { Auction } from "auctions/auctions.validation";
import { Auth } from "auth/auth.model";
import { Product } from "products/products.validation";
import { PostgresService } from "services/postgres.service";
import { RoleName } from "roles/roles.validation";
import { User } from "users/users.validation";
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

export const createUser = async (username: string) => {
  const result = await db.query<User>(
    `INSERT INTO users (username, email, password, role_id)
     VALUES ($1, $2, $3, (SELECT id FROM roles WHERE name = $4)) RETURNING *`,
    [username, `${username}@example.com`, "not-used-for-login", RoleName.USER]
  );
  const user = result.rows[0];
  const [cookieName, token] = Auth.attachCookieParams(user.id);
  return { ...user, cookie: `${cookieName}=${token}` };
};

export const createProduct = async (ownerId: number) => {
  const result = await db.query<Product>(
    "INSERT INTO products (name, description, owner_id, price_in_cents) VALUES ($1, $2, $3, $4) RETURNING *",
    [faker.commerce.productName(), faker.commerce.productDescription(), ownerId, 1000]
  );
  return result.rows[0];
};

export const createActiveAuction = async (creatorId: number, productId: number) => {
  const result = await db.query<Auction>(
    `INSERT INTO auctions (product_id, creator_id, start_time, duration_hours, starting_price_in_cents, created_at)
     VALUES ($1, $2, NOW() - INTERVAL '1 hour', $3, $4, NOW() - INTERVAL '2 hours') RETURNING *`,
    [productId, creatorId, 48, 1000]
  );
  return result.rows[0];
};

/** Creates a seller with a product and an active auction for it. */
export const createAuction = async () => {
  const seller = await createUser("seller");
  const product = await createProduct(seller.id);
  return createActiveAuction(seller.id, product.id);
};
