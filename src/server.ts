import { AuthHttpController } from "auth/auth.controller";
import App from "./app";
import { ProductHttpController } from "products/products.controller";
import { AuthService } from "auth/auth.service";
import { ProductService } from "products/products.service";
import { ProductRepository } from "products/products.repository";
import { Pool } from "pg";
import { env } from "config/env";
import { UsersRepository } from "users/users.repository";
import { AWSService } from "services/aws.service";
import { ResendService } from "services/resend.service";
import { AuctionHttpController } from "auctions/auctions.controller";
import { AuctionService } from "auctions/auctions.service";
import { AuctionRepository } from "auctions/auctions.repository";
import { UserService } from "users/users.service";
import { BidService } from "bids/bids.service";
import { BidRepository } from "bids/bids.repository";
import { BidSocketController } from "bids/bids.socket";
import { BidHttpController } from "bids/bids.controller";
import { AuctionSocketController } from "auctions/auctions.socket";

const DB = new Pool({
  host: env.POSTGRES_HOST,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  port: env.POSTGRES_PORT,
  idleTimeoutMillis: 30000
});

const usersService = new UserService(new UsersRepository(DB));

const productService = new ProductService(
  new ProductRepository(DB),
  ResendService.getInstance(),
  AWSService.getInstance()
);

const auctionService = new AuctionService(
  new AuctionRepository(DB),
  productService,
  ResendService.getInstance()
);

const bidService = new BidService(new BidRepository(DB), auctionService);

const authService = new AuthService(usersService);

const app = new App(
  [
    new AuthHttpController(authService),
    new ProductHttpController(productService, authService),
    new AuctionHttpController(auctionService, authService),
    new BidHttpController(bidService)
  ],
  [
    new AuctionSocketController(authService, auctionService),
    new BidSocketController(bidService, authService, auctionService)
  ]
);

app.listen();
