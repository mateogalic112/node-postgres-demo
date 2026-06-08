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
import {
  createMockDatabaseService,
  embeddingService,
  filesService,
  mailService
} from "__tests__/mocks";
import {
  createActiveAuction,
  createProductRequest,
  getTestClient,
  registerUserRequest
} from "__tests__/setup";
import { AuctionBid, CreateBidPayload } from "./bids.validation";

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
    const bidService = new BidService(new BidRepository(DB), DB);
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

  const once = <T>(socket: ClientSocket, event: string): Promise<T> =>
    new Promise((resolve) => socket.once(event, resolve));

  const connectAndWait = async (cookie: string): Promise<ClientSocket> => {
    const socket = connectSocket(cookie);
    await once(socket, "connect");
    return socket;
  };

  // never race the room membership.
  const joinAuctionRoom = async (socket: ClientSocket, auctionId: number) => {
    const joined = once(socket, "auctions:auction_joined");
    socket.emit("auctions:join_auction", { auction_id: auctionId });
    await joined;
  };

  const registerUser = async (username: string) => {
    const response = await registerUserRequest(app, username);
    return {
      cookie: response.headers["set-cookie"][0] as string,
      ...response.body.data
    };
  };

  const setupAuction = async () => {
    const seller = await registerUser("seller");
    const productResponse = await createProductRequest(app, seller.cookie);
    const auction = await createActiveAuction(seller.id, productResponse.body.data.id);
    return { auction, seller };
  };

  type CreateBidResult = { type: "created"; data: AuctionBid } | { type: "error"; message: string };

  const placeBid = async (
    socket: ClientSocket,
    payload: CreateBidPayload
  ): Promise<CreateBidResult> => {
    return new Promise((resolve) => {
      socket.once("bids:bid_created", (res) => resolve({ type: "created", data: res.data }));
      socket.once("bids:create_bid_failed", (res) =>
        resolve({ type: "error", message: res.message })
      );
      socket.emit("bids:create_bid", payload);
    });
  };

  describe("Placing new bid", () => {
    const VALID_BID_IN_CENTS = 5000;

    it("emits bids:bid_created back to the sender on a valid bid", async () => {
      const { auction } = await setupAuction();

      const bidder = await registerUser("bidder");
      const socket = await connectAndWait(bidder.cookie);

      const result = await placeBid(socket, {
        auction_id: auction.id,
        amount_in_cents: VALID_BID_IN_CENTS
      });

      expect(result).toMatchObject({
        data: { username: bidder.username, amount_in_cents: VALID_BID_IN_CENTS }
      });
    });

    it("broadcasts bids:bid_created to other users in the auction room", async () => {
      const { auction } = await setupAuction();

      const bidder = await registerUser("bidder");
      const watcher = await registerUser("watcher");

      // Watcher joins and waits for the ack so the broadcast cannot race the join.
      const watcherSocket = await connectAndWait(watcher.cookie);
      await joinAuctionRoom(watcherSocket, auction.id);
      const broadcast = once<{ data: AuctionBid }>(watcherSocket, "bids:bid_created");

      const bidderSocket = await connectAndWait(bidder.cookie);
      await placeBid(bidderSocket, {
        auction_id: auction.id,
        amount_in_cents: VALID_BID_IN_CENTS
      });

      const response = await broadcast;
      expect(response.data).toMatchObject({
        username: bidder.username,
        amount_in_cents: VALID_BID_IN_CENTS
      });
    });

    it("emits bids:create_bid_failed when the user is not authenticated", async () => {
      const socket = await connectAndWait("invalid_cookie=abc");

      const result = await placeBid(socket, {
        auction_id: 1,
        amount_in_cents: VALID_BID_IN_CENTS
      });
      expect(result).toMatchObject({
        message: "Token not found"
      });
    });

    it("emits bids:create_bid_failed when the payload is invalid", async () => {
      const bidder = await registerUser("bidder");
      const socket = await connectAndWait(bidder.cookie);

      const result = await new Promise((resolve) => {
        socket.once("bids:create_bid_failed", resolve);
        socket.emit("bids:create_bid", { invalid: "payload" });
      });
      expect(result).toMatchObject({
        message: /invalid input/i
      });
    });

    it("emits bids:create_bid_failed when the auction does not exist", async () => {
      const bidder = await registerUser("bidder");
      const socket = await connectAndWait(bidder.cookie);

      const result = await placeBid(socket, {
        auction_id: 99999,
        amount_in_cents: VALID_BID_IN_CENTS
      });
      expect(result).toMatchObject({
        message: "Auction not active"
      });
    });

    it("emits bids:create_bid_failed when the bid is below the minimum (starting price + 10%)", async () => {
      const { auction } = await setupAuction();
      const bidder = await registerUser("bidder");
      const socket = await connectAndWait(bidder.cookie);

      // Starting price 1000c, +10% => minimum 1100c. 1099c must be rejected.
      const result = await placeBid(socket, {
        auction_id: auction.id,
        amount_in_cents: auction.starting_price_in_cents + 99
      });
      expect(result).toMatchObject({
        message: /bid must be at least €11/i
      });
    });

    it("enforces the minimum increase above the current highest bid across sequential bids", async () => {
      const { auction } = await setupAuction();

      const firstBidder = await registerUser("bidder");
      const secondBidder = await registerUser("bidder2");

      const firstSocket = await connectAndWait(firstBidder.cookie);
      const firstResult = await placeBid(firstSocket, {
        auction_id: auction.id,
        amount_in_cents: VALID_BID_IN_CENTS // 5000c becomes the highest bid
      });
      expect(firstResult.type).toBe("created");

      const secondSocket = await connectAndWait(secondBidder.cookie);

      // Highest is 5000c, minimum increase is +100c => 5100c. 5099c is too low.
      const tooLow = await placeBid(secondSocket, {
        auction_id: auction.id,
        amount_in_cents: VALID_BID_IN_CENTS + 99
      });
      expect(tooLow.type).toBe("error");

      // Exactly at the threshold is accepted.
      const accepted = await placeBid(secondSocket, {
        auction_id: auction.id,
        amount_in_cents: VALID_BID_IN_CENTS + 100
      });
      expect(accepted).toMatchObject({
        type: "created",
        data: { username: secondBidder.username, amount_in_cents: VALID_BID_IN_CENTS + 100 }
      });
    });
  });
});
