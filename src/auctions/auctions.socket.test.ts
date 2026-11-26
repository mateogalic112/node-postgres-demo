import { createActiveAuction, createProduct, createTestApp, createUser } from "__tests__/setup";
import { Server } from "http";
import { io as clientIo, Socket } from "socket.io-client";

describe("AuctionsSocketController", () => {
  let server: Server;
  let url: string;
  const openSockets: Socket[] = [];

  beforeAll((done) => {
    server = createTestApp().getServer();
    server.listen(0, () => {
      url = `http://localhost:${(server.address() as { port: number }).port}`;
      done();
    });
  });

  afterEach(() => {
    openSockets.forEach((socket) => socket.disconnect());
    openSockets.length = 0;
  });

  afterAll((done) => {
    server.close(done);
  });

  /** Opens a socket connection, sending `cookie` in the handshake when given. */
  const connectSocket = (cookie?: string) =>
    new Promise<Socket>((resolve) => {
      const socket = clientIo(url, {
        transports: ["websocket"],
        extraHeaders: cookie ? { cookie } : {}
      });
      openSockets.push(socket);
      socket.once("connect", () => resolve(socket));
    });

  /** Resolves with the next event the server sends to this socket, whatever its name. */
  const nextServerEvent = (socket: Socket) =>
    new Promise<{ event: string; data: unknown }>((resolve) => {
      const listener = (event: string, data: unknown) => {
        socket.offAny(listener);
        resolve({ event, data });
      };
      socket.onAny(listener);
    });

  const createAuction = async () => {
    const seller = await createUser("seller");
    const product = await createProduct(seller.id);
    return createActiveAuction(seller.id, product.id);
  };

  describe("auctions:join_auction", () => {
    it("replies with auctions:auction_joined when a logged-in user joins", async () => {
      const auction = await createAuction();
      const watcher = await createUser("watcher");
      const socket = await connectSocket(watcher.cookie);

      const reply = nextServerEvent(socket);
      socket.emit("auctions:join_auction", { auction_id: auction.id });

      expect(await reply).toEqual({
        event: "auctions:auction_joined",
        data: { auction_id: auction.id }
      });
    });

    it("replies with auctions:join_auction_failed when the socket has no auth cookie", async () => {
      const auction = await createAuction();
      const socket = await connectSocket();

      const reply = nextServerEvent(socket);
      socket.emit("auctions:join_auction", { auction_id: auction.id });

      expect(await reply).toEqual({
        event: "auctions:join_auction_failed",
        data: { message: "Cookie header not found" }
      });
    });
  });

  describe("auctions:leave_auction", () => {
    it("replies with auctions:auction_left when a user leaves a room they joined", async () => {
      const auction = await createAuction();
      const watcher = await createUser("watcher");
      const socket = await connectSocket(watcher.cookie);

      const joined = nextServerEvent(socket);
      socket.emit("auctions:join_auction", { auction_id: auction.id });
      expect(await joined).toMatchObject({ event: "auctions:auction_joined" });

      const reply = nextServerEvent(socket);
      socket.emit("auctions:leave_auction", { auction_id: auction.id });

      expect(await reply).toEqual({
        event: "auctions:auction_left",
        data: { auction_id: auction.id }
      });
    });
  });
});
