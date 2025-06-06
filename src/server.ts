import { AuthController } from "auth/auth.controller";
import App from "./app";
import { ProductController } from "products/products.controller";
import { AuthService } from "auth/auth.service";
import { ProductService } from "products/products.service";
import { ProductRepository } from "products/products.repository";
import { Pool } from "pg";
import { env } from "config/env";
import { UsersRepository } from "users/users.repository";
import { AWSService } from "services/aws.service";
import { ResendService } from "services/resend.service";
import { AuctionController } from "auctions/auctions.controller";
import { AuctionService } from "auctions/auctions.service";
import { AuctionRepository } from "auctions/auctions.repository";
import { UserService } from "users/users.service";

const DB = new Pool({
  host: env.POSTGRES_HOST,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  port: env.POSTGRES_PORT,
  idleTimeoutMillis: 30000
});

const authController = new AuthController(DB, new AuthService(new UsersRepository(DB)));
const productController = new ProductController(
  new UserService(new UsersRepository(DB)),
  new ProductService(
    new ProductRepository(DB),
    ResendService.getInstance(),
    AWSService.getInstance()
  )
);

const auctionController = new AuctionController(
  DB,
  new AuctionService(new AuctionRepository(DB), new ProductRepository(DB)),
  ResendService.getInstance()
);

const app = new App([authController, productController, auctionController]);

app.listen();
