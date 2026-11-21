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
import { CustomersRepository } from "customers/customers.repository";
import { CustomersService } from "customers/customers.service";
import { DatabaseService } from "interfaces/database.interface";
import { EmbeddingsService } from "interfaces/embeddings.interface";
import { FilesService } from "interfaces/files.interface";
import { LoggerService } from "interfaces/logger.interface";
import { MailService } from "interfaces/mail.interface";
import { PaymentsService } from "interfaces/payments.interface";
import { OrdersHttpController } from "orders/orders.controller";
import { OrdersRepository } from "orders/orders.repository";
import { PaymentsHttpController } from "payments/payments.controller";
import { ProductsHttpController } from "products/products.controller";
import { ProductsRepository } from "products/products.repository";
import { ProductsService } from "products/products.service";
import { RolesRepository } from "roles/roles.repository";
import { RolesService } from "roles/roles.service";
import { UsersHttpController } from "users/users.controller";
import { UsersRepository } from "users/users.repository";

export interface AppDependencies {
  db: DatabaseService;
  filesService: FilesService;
  embeddingsService: EmbeddingsService;
  mailService: MailService;
  paymentsService: PaymentsService;
  logger: LoggerService;
}

export function createApp({
  db,
  filesService,
  embeddingsService,
  mailService,
  paymentsService,
  logger
}: AppDependencies) {
  const productsService = new ProductsService(
    new ProductsRepository(db, logger),
    filesService,
    embeddingsService,
    logger
  );

  const usersRepository = new UsersRepository(db);
  const authService = new AuthService(usersRepository);
  const auctionsService = new AuctionsService(new AuctionsRepository(db));
  const bidsService = new BidsService(new BidsRepository(db), db, logger);
  const rolesService = new RolesService(new RolesRepository(db));
  const ordersRepository = new OrdersRepository(db);
  const customersService = new CustomersService(new CustomersRepository(db), paymentsService);

  return new App(
    [
      new AuthHttpController(authService, usersRepository),
      new ProductsHttpController(productsService, authService, mailService),
      new AuctionsHttpController(auctionsService, authService, mailService),
      new BidsHttpController(bidsService),
      new UsersHttpController(authService, rolesService, usersRepository),
      new BotHttpController(productsService, logger),
      new OrdersHttpController(authService, ordersRepository, customersService),
      new PaymentsHttpController(paymentsService, ordersRepository, logger)
    ],
    [
      new AuctionsSocketController(auctionsService),
      new BidsSocketController(bidsService, authService, auctionsService)
    ],
    logger
  );
}
