import { AuthHttpController } from "auth/auth.controller";
import App from "./app";
import { ProductHttpController } from "products/products.controller";
import { AuthService } from "auth/auth.service";
import { ProductService } from "products/products.service";
import { ProductRepository } from "products/products.repository";
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
import { PostgresService } from "services/postgres.service";
import { LoggerService } from "services/logger.service";
import { RolesService } from "roles/roles.service";
import { RolesRepository } from "roles/roles.repository";
import { UsersHttpController } from "users/users.controller";
import { BotHttpController } from "bot/bot.controller";
import { EmbeddingService } from "services/embedding.service";

const DB = PostgresService.getInstance();

const usersService = new UserService(new UsersRepository(DB));

const productService = new ProductService(
  new ProductRepository(DB),
  ResendService.getInstance(),
  AWSService.getInstance(),
  EmbeddingService.getInstance()
);

const auctionService = new AuctionService(new AuctionRepository(DB), ResendService.getInstance());

const bidService = new BidService(new BidRepository(DB), DB, LoggerService.getInstance());

const authService = new AuthService(usersService);

const rolesService = new RolesService(new RolesRepository(DB));

const app = new App(
  [
    new AuthHttpController(authService),
    new ProductHttpController(productService, authService),
    new AuctionHttpController(auctionService, authService),
    new BidHttpController(bidService),
    new UsersHttpController(authService, rolesService, usersService),
    new BotHttpController(productService, LoggerService.getInstance())
  ],
  [
    new AuctionSocketController(auctionService),
    new BidSocketController(bidService, authService, auctionService)
  ]
);

app.listen();
