import App from "app";
import { AuctionsHttpController } from "auctions/auctions.controller";
import { AuctionsRepository } from "auctions/auctions.repository";
import { AuctionsService } from "auctions/auctions.service";
import { AuctionsSocketController } from "auctions/auctions.socket";
import { AuthHttpController } from "auth/auth.controller";
import { AuthService } from "auth/auth.service";
import { BidsHttpController } from "bids/bids.controller";
import { BidsRepository } from "bids/bids.repository";
import { BidsService } from "bids/bids.service";
import { BidsSocketController } from "bids/bids.socket";
import { BotHttpController } from "bot/bot.controller";
import { DatabaseService } from "interfaces/database.interface";
import { EmbeddingsService } from "interfaces/embeddings.interface";
import { FilesService } from "interfaces/files.interface";
import { LoggerService } from "interfaces/logger.interface";
import { MailService } from "interfaces/mail.interface";
import { PaymentsService } from "interfaces/payments.interface";
import { OrdersHttpController } from "orders/orders.controller";
import { OrdersRepository } from "orders/orders.repository";
import { OrdersService } from "orders/orders.service";
import { PaymentsHttpController } from "payments/payments.controller";
import { ProductsHttpController } from "products/products.controller";
import { ProductsRepository } from "products/products.repository";
import { ProductsService } from "products/products.service";
import { RolesRepository } from "roles/roles.repository";
import { RolesService } from "roles/roles.service";
import { UsersHttpController } from "users/users.controller";
import { UsersRepository } from "users/users.repository";
import { UsersService } from "users/users.service";

export interface AppDependencies {
  db: DatabaseService;
  files: FilesService;
  embeddings: EmbeddingsService;
  mail: MailService;
  payments: PaymentsService;
  logger: LoggerService;
}

export function createApp({ db, files, embeddings, mail, payments, logger }: AppDependencies) {
  const productsService = new ProductsService(
    new ProductsRepository(db, logger),
    files,
    embeddings,
    logger
  );
  const usersService = new UsersService(new UsersRepository(db), new RolesRepository(db), payments);
  const authService = new AuthService(usersService);
  const auctionsService = new AuctionsService(new AuctionsRepository(db));
  const bidsService = new BidsService(new BidsRepository(db), db, logger);
  const rolesService = new RolesService(new RolesRepository(db));
  const ordersService = new OrdersService(new OrdersRepository(db));

  return new App(
    [
      new AuthHttpController(authService),
      new ProductsHttpController(productsService, authService, mail),
      new AuctionsHttpController(auctionsService, authService, mail),
      new BidsHttpController(bidsService),
      new UsersHttpController(authService, rolesService, usersService),
      new BotHttpController(productsService, logger),
      new OrdersHttpController(authService, usersService, ordersService, payments),
      new PaymentsHttpController(payments, ordersService, logger)
    ],
    [
      new AuctionsSocketController(auctionsService),
      new BidsSocketController(bidsService, authService, auctionsService)
    ],
    logger
  );
}
