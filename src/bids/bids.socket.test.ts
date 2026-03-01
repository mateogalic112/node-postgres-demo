import App from "app";
import { Server } from "http";
import { io as clientIo, Socket as ClientSocket } from "socket.io-client";
import { AuthHttpController } from "auth/auth.controller";
import { AuthService } from "auth/auth.service";
import { UsersRepository } from "users/users.repository";
import { UserService } from "users/users.service";
import { AuctionService } from "auctions/auctions.service";
import { AuctionRepository } from "auctions/auctions.repository";
import { AuctionHttpController } from "auctions/auctions.controller";
import { AuctionSocketController } from "auctions/auctions.socket";
import { BidSocketController } from "./bids.socket";
import { BidService } from "./bids.service";
import { BidRepository } from "./bids.repository";
import { ProductHttpController } from "products/products.controller";
import { ProductService } from "products/products.service";
import { ProductRepository } from "products/products.repository";
import { RolesRepository } from "roles/roles.repository";
import { StripeService } from "services/stripe.service";
import { LoggerService } from "services/logger.service";
import { Auction } from "auctions/auctions.validation";
import { Client } from "pg";
import { subHours } from "date-fns";
import {
  createMockDatabaseService,
  embeddingService,
  filesService,
  mailService
} from "__tests__/mocks";
import { createProductRequest, getTestClient, registerUserRequest } from "__tests__/setup";

const createActiveAuction = async (client: Client, creatorId: number, productId: number) => {
  const result = await client.query<Auction>(
    `INSERT INTO auctions (product_id, creator_id, start_time, duration_hours, starting_price_in_cents)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [productId, creatorId, subHours(new Date(), 1), 48, 1000]
  );
  return result.rows[0];
};

describe("BidSocketController", () => {
  let app: App;
  let server: Server;
  let address: string;
  const sockets: ClientSocket[] = [];

  beforeAll((done) => {
    const DB = createMockDatabaseService(getTestClient());

    const productService = new ProductService(
      new ProductRepository(DB),
      filesService,
      embeddingService
    );
    const bidService = new BidService(new BidRepository(DB), DB, LoggerService.getInstance());
    const stripeService = new StripeService(new ProductRepository(DB));
    const authService = new AuthService(
      new UserService(new UsersRepository(DB), new RolesRepository(DB), stripeService)
    );
    const auctionService = new AuctionService(new AuctionRepository(DB));
    app = new App(
      [
        new AuthHttpController(authService),
        new AuctionHttpController(auctionService, authService, mailService),
        new ProductHttpController(productService, authService, mailService)
      ],
      [
        new AuctionSocketController(auctionService),
        new BidSocketController(bidService, authService, auctionService)
      ]
    );

    server = app.getServer();
    server.listen(0, () => {
      const addr = server.address();
      address = `http://localhost:${(addr as { port: number }).port}`;
      done();
    });
  });

  afterEach(() => {
    sockets.forEach((s) => s.disconnect());
    sockets.length = 0;
  });

  afterAll((done) => {
    server.close(done);
  });

  const connectSocket = (cookie: string): ClientSocket => {
    const socket = clientIo(address, {
      extraHeaders: { cookie },
      transports: ["websocket"]
    });
    sockets.push(socket);
    return socket;
  };

  const getAuthCookie = async (username: string) => {
    const response = await registerUserRequest(app, username);
    return {
      cookie: response.headers["set-cookie"][0] as string,
      userId: response.body.data.id as number
    };
  };

  const setupAuction = async () => {
    const seller = await getAuthCookie("seller");
    const productResponse = await createProductRequest(app, seller.cookie);
    const productId = productResponse.body.data.id;
    const auction = await createActiveAuction(getTestClient(), seller.userId, productId);
    return { auction, seller };
  };

  describe("bids:create_bid", () => {
    it("should emit bids:bid_created back to sender on valid bid", (done) => {
      (async () => {
        try {
          const { auction } = await setupAuction();
          const bidder = await getAuthCookie("bidder");
          const BID_AMOUNT_IN_CENTS = 5000;
          const socket = connectSocket(bidder.cookie);

          socket.on("bids:bid_created", (response) => {
            expect(response.data).toMatchObject({
              auction_id: auction.id,
              user_id: bidder.userId,
              amount_in_cents: BID_AMOUNT_IN_CENTS
            });
            done();
          });

          socket.on("bids:error", (err) => {
            done(new Error(err.message));
          });

          socket.on("connect", () => {
            socket.emit("bids:create_bid", {
              auction_id: auction.id,
              amount_in_cents: BID_AMOUNT_IN_CENTS
            });
          });
        } catch (error) {
          done(error);
        }
      })();
    });

    it("should broadcast bids:bid_created to other users in the auction room", (done) => {
      (async () => {
        try {
          const { auction } = await setupAuction();
          const bidder = await getAuthCookie("bidder");
          const BID_AMOUNT_IN_CENTS = 5000;

          const watcher = await getAuthCookie("watcher");
          const watcherSocket = connectSocket(watcher.cookie);

          watcherSocket.on("bids:bid_created", (response) => {
            expect(response.data).toMatchObject({
              auction_id: auction.id,
              amount_in_cents: BID_AMOUNT_IN_CENTS
            });
            done();
          });

          watcherSocket.on("bids:error", (err) => {
            done(new Error(err.message));
          });

          // Wait for watcher to connect, join the room, then connect bidder
          watcherSocket.on("connect", () => {
            watcherSocket.emit("auctions:join_auction", { auction_id: auction.id });

            // Allow server to process the room join before bidder connects
            setTimeout(() => {
              const bidderSocket = connectSocket(bidder.cookie);

              bidderSocket.on("connect", () => {
                bidderSocket.emit("bids:create_bid", {
                  auction_id: auction.id,
                  amount_in_cents: BID_AMOUNT_IN_CENTS
                });
              });
            }, 200);
          });
        } catch (error) {
          done(error);
        }
      })();
    });

    it("should emit bids:error when user is not authenticated", (done) => {
      const socket = connectSocket("invalid_cookie=abc");

      socket.on("connect", () => {
        socket.emit("bids:create_bid", {
          auction_id: 1,
          amount_in_cents: 5000
        });
      });

      socket.on("bids:error", (response) => {
        expect(response.message).toBeDefined();
        done();
      });
    });

    it("should emit bids:error when payload is invalid", (done) => {
      (async () => {
        try {
          const bidder = await getAuthCookie("bidder");
          const socket = connectSocket(bidder.cookie);

          socket.on("connect", () => {
            socket.emit("bids:create_bid", { invalid: "payload" });
          });

          socket.on("bids:error", (response) => {
            expect(response.message).toBeDefined();
            done();
          });
        } catch (error) {
          done(error);
        }
      })();
    });

    it("should emit bids:error when auction does not exist", (done) => {
      (async () => {
        try {
          const bidder = await getAuthCookie("bidder");
          const socket = connectSocket(bidder.cookie);

          socket.on("connect", () => {
            socket.emit("bids:create_bid", {
              auction_id: 99999,
              amount_in_cents: 5000
            });
          });

          socket.on("bids:error", (response) => {
            expect(response.message).toBeDefined();
            done();
          });
        } catch (error) {
          done(error);
        }
      })();
    });

    it("should emit bids:error when bid amount is too low", (done) => {
      (async () => {
        try {
          const { auction } = await setupAuction();
          const bidder = await getAuthCookie("bidder");
          const socket = connectSocket(bidder.cookie);

          socket.on("connect", () => {
            // Auction starting price is 1000 cents with 10% minimum increase = 1100 minimum
            socket.emit("bids:create_bid", {
              auction_id: auction.id,
              amount_in_cents: auction.starting_price_in_cents + 99 // 1099
            });
          });

          socket.on("bids:error", (response) => {
            expect(response.message).toBeDefined();
            done();
          });
        } catch (error) {
          done(error);
        }
      })();
    });
  });
});
