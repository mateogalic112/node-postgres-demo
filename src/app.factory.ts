import App from "app";
import { AuctionsHttpController } from "auctions/auctions.controller";
import { AuctionsRepository } from "auctions/auctions.repository";
import { AuctionsSocketController } from "auctions/auctions.socket";
import { AuthHttpController } from "auth/auth.controller";
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
import { RolesRepository } from "roles/roles.repository";
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
  const productsRepository = new ProductsRepository(db);
  const usersRepository = new UsersRepository(db);
  const rolesRepository = new RolesRepository(db);
  const auctionsRepository = new AuctionsRepository(db);
  const bidsRepository = new BidsRepository(db);
  const bidsService = new BidsService(bidsRepository, auctionsRepository, db);
  const ordersRepository = new OrdersRepository(db);
  const customersService = new CustomersService(new CustomersRepository(db), paymentsService);

  return new App(
    [
      new AuthHttpController(usersRepository),
      new ProductsHttpController(
        productsRepository,
        usersRepository,
        mailService,
        filesService,
        embeddingsService
      ),
      new AuctionsHttpController(auctionsRepository, usersRepository, mailService),
      new BidsHttpController(bidsRepository),
      new UsersHttpController(rolesRepository, usersRepository),
      new BotHttpController(productsRepository, embeddingsService, logger),
      new OrdersHttpController(usersRepository, ordersRepository, customersService),
      new PaymentsHttpController(paymentsService, ordersRepository, logger)
    ],
    [new AuctionsSocketController(), new BidsSocketController(bidsService)],
    logger
  );
}
