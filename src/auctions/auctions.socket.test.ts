import { createAuction, createUser } from "__tests__/setup";
import { once, useSocketServer } from "__tests__/socket";

describe("AuctionsSocketController", () => {
  const { connectSocket } = useSocketServer();

  describe("auctions:join_auction", () => {
    it("replies with auctions:auction_joined when a logged-in user joins", async () => {
      const auction = await createAuction();
      const watcher = await createUser("watcher");
      const socket = await connectSocket(watcher.cookie);

      const joined = once(socket, "auctions:auction_joined");
      socket.emit("auctions:join_auction", { auction_id: auction.id });

      expect(await joined).toEqual({ auction_id: auction.id });
    });

    it("replies with auctions:join_auction_failed when the socket has no auth cookie", async () => {
      const auction = await createAuction();
      const socket = await connectSocket();

      const failed = once(socket, "auctions:join_auction_failed");
      socket.emit("auctions:join_auction", { auction_id: auction.id });

      expect(await failed).toEqual({ message: "Cookie header not found" });
    });
  });

  describe("auctions:leave_auction", () => {
    it("replies with auctions:auction_left when a user leaves a room they joined", async () => {
      const auction = await createAuction();
      const watcher = await createUser("watcher");
      const socket = await connectSocket(watcher.cookie);

      const joined = once(socket, "auctions:auction_joined");
      socket.emit("auctions:join_auction", { auction_id: auction.id });
      await joined;

      const left = once(socket, "auctions:auction_left");
      socket.emit("auctions:leave_auction", { auction_id: auction.id });

      expect(await left).toEqual({ auction_id: auction.id });
    });
  });
});
