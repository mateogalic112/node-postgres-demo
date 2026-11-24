import {
  createActiveAuction,
  createProductRequest,
  createTestApp,
  registerUserRequest
} from "__tests__/setup";
import App from "app";
import { Server } from "http";
import { io as clientIo, Socket as ClientSocket } from "socket.io-client";
import { AuctionBid, CreateBidPayload } from "./bids.validation";

describe("BidsSocketController", () => {
  let app: App;
  let server: Server;
  let address: string;
  const sockets: ClientSocket[] = [];

  beforeAll((done) => {
    app = createTestApp();

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

  const expectNoEvent = (socket: ClientSocket, event: string, windowMs = 200): Promise<void> =>
    new Promise((resolve, reject) => {
      const onEvent = () => {
        clearTimeout(timer);
        reject(new Error(`Unexpected ${event} event`));
      };
      const timer = setTimeout(() => {
        socket.off(event, onEvent);
        resolve();
      }, windowMs);
      socket.once(event, onEvent);
    });

  // Wait for the join ack so a broadcast can't reach the room before this socket is in it.
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
      const onCreated = (res: { data: AuctionBid }) => {
        socket.off("bids:create_bid_failed", onFailed);
        resolve({ type: "created", data: res.data });
      };
      const onFailed = (res: { message: string }) => {
        socket.off("bids:bid_created", onCreated);
        resolve({ type: "error", message: res.message });
      };
      socket.once("bids:bid_created", onCreated);
      socket.once("bids:create_bid_failed", onFailed);
      socket.emit("bids:create_bid", payload);
    });
  };

  describe("Placing new bid", () => {
    const BID_IN_CENTS = 5000;

    it("emits bids:bid_created back to the sender on a valid bid", async () => {
      const { auction } = await setupAuction();

      const bidder = await registerUser("bidder");
      const socket = await connectAndWait(bidder.cookie);

      const result = await placeBid(socket, {
        auction_id: auction.id,
        amount_in_cents: BID_IN_CENTS
      });

      expect(result).toMatchObject({
        type: "created",
        data: { username: bidder.username, amount_in_cents: BID_IN_CENTS }
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
        amount_in_cents: BID_IN_CENTS
      });

      const response = await broadcast;
      expect(response.data).toMatchObject({
        username: bidder.username,
        amount_in_cents: BID_IN_CENTS
      });
    });

    it("delivers bids:bid_created to the sender exactly once when the sender is in the room", async () => {
      const { auction } = await setupAuction();
      const bidder = await registerUser("bidder");
      const socket = await connectAndWait(bidder.cookie);
      await joinAuctionRoom(socket, auction.id);

      const result = await placeBid(socket, {
        auction_id: auction.id,
        amount_in_cents: BID_IN_CENTS
      });

      expect(result.type).toBe("created");
      await expectNoEvent(socket, "bids:bid_created");
    });

    it("does not broadcast to users in a different auction room", async () => {
      const { auction } = await setupAuction();
      const bidder = await registerUser("bidder");
      const watcher = await registerUser("watcher");

      const watcherSocket = await connectAndWait(watcher.cookie);
      await joinAuctionRoom(watcherSocket, auction.id + 1);
      const noBroadcast = expectNoEvent(watcherSocket, "bids:bid_created");

      const bidderSocket = await connectAndWait(bidder.cookie);
      const result = await placeBid(bidderSocket, {
        auction_id: auction.id,
        amount_in_cents: BID_IN_CENTS
      });

      expect(result.type).toBe("created");
      await noBroadcast;
    });

    it("does not broadcast a rejected bid to the auction room", async () => {
      const { auction } = await setupAuction();
      const bidder = await registerUser("bidder");
      const watcher = await registerUser("watcher");

      const watcherSocket = await connectAndWait(watcher.cookie);
      await joinAuctionRoom(watcherSocket, auction.id);
      const noBroadcast = expectNoEvent(watcherSocket, "bids:bid_created");

      const bidderSocket = await connectAndWait(bidder.cookie);
      // Any rejection works here; 1 cent is below every plausible minimum-bid rule.
      const result = await placeBid(bidderSocket, {
        auction_id: auction.id,
        amount_in_cents: 1
      });

      expect(result.type).toBe("error");
      await noBroadcast;
    });

    it("emits bids:create_bid_failed when the user is not authenticated", async () => {
      const { auction } = await setupAuction();
      const socket = await connectAndWait("invalid_cookie=abc");

      const result = await placeBid(socket, {
        auction_id: auction.id,
        amount_in_cents: BID_IN_CENTS
      });
      expect(result).toMatchObject({ type: "error", message: expect.any(String) });
    });

    it("emits bids:create_bid_failed when the payload is invalid", async () => {
      const bidder = await registerUser("bidder");
      const socket = await connectAndWait(bidder.cookie);

      const result = await placeBid(socket, { invalid: "payload" } as unknown as CreateBidPayload);
      expect(result).toMatchObject({ type: "error", message: expect.any(String) });
    });

    it("emits bids:create_bid_failed when the auction does not exist", async () => {
      const bidder = await registerUser("bidder");
      const socket = await connectAndWait(bidder.cookie);

      const result = await placeBid(socket, {
        auction_id: 99999,
        amount_in_cents: BID_IN_CENTS
      });
      expect(result).toMatchObject({ type: "error", message: expect.any(String) });
    });
  });
});
