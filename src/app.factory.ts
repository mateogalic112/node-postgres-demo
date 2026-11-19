import App from "app";
import { AuctionHttpController } from "auctions/auctions.controller";
import { AuctionRepository } from "auctions/auctions.repository";
import { AuctionService } from "auctions/auctions.service";
import { AuctionSocketController } from "auctions/auctions.socket";
import { AuthHttpController } from "auth/auth.controller";
import { AuthService } from "auth/auth.service";
import { BidHttpController } from "bids/bids.controller";
import { BidRepository } from "bids/bids.repository";
import { BidService } from "bids/bids.service";
import { BidSocketController } from "bids/bids.socket";
import { BotHttpController } from "bot/bot.controller";
import { DatabaseService } from "interfaces/database.interface";
import { EmbeddingService } from "interfaces/embeddings.interface";
import { FilesService } from "interfaces/files.interface";
import { MailService } from "interfaces/mail.interface";
import { PaymentsService } from "interfaces/payments.interface";
import { OrderHttpController } from "orders/orders.controller";
import { OrderRepository } from "orders/orders.repository";
import { OrderService } from "orders/orders.service";
import { PaymentsHttpController } from "payments/payments.controller";
import { ProductHttpController } from "products/products.controller";
import { ProductRepository } from "products/products.repository";
import { ProductService } from "products/products.service";
import { RolesRepository } from "roles/roles.repository";
import { RolesService } from "roles/roles.service";
import { LoggerService } from "services/logger.service";
import { UsersHttpController } from "users/users.controller";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";

export interface AppDependencies {
  db: DatabaseService;
  files: FilesService;
  embeddings: EmbeddingService;
  mail: MailService;
  payments: PaymentsService;
  logger: LoggerService;
}

export function createApp({ db, files, embeddings, mail, payments, logger }: AppDependencies) {
  const productService = new ProductService(new ProductRepository(db), files, embeddings);
  const usersService = new UserService(new UsersRepository(db), new RolesRepository(db), payments);
  const authService = new AuthService(usersService);
  const auctionService = new AuctionService(new AuctionRepository(db));
  const bidService = new BidService(new BidRepository(db), db);
  const rolesService = new RolesService(new RolesRepository(db));
  const orderService = new OrderService(new OrderRepository(db));

  return new App(
    [
      new AuthHttpController(authService),
      new ProductHttpController(productService, authService, mail),
      new AuctionHttpController(auctionService, authService, mail),
      new BidHttpController(bidService),
      new UsersHttpController(authService, rolesService, usersService),
      new BotHttpController(productService, logger),
      new OrderHttpController(authService, usersService, orderService, payments),
      new PaymentsHttpController(payments, orderService, logger)
    ],
    [
      new AuctionSocketController(auctionService),
      new BidSocketController(bidService, authService, auctionService)
    ]
  );
}
