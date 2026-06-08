import { Socket } from "socket.io";
import { createBidSchema } from "./bids.validation";
import { SocketController } from "api/api.controllers";
import { BidService } from "./bids.service";
import { AuthService } from "auth/auth.service";
import { formatResponse } from "api/api.formats";
import { AuctionService } from "auctions/auctions.service";
import { getErrorMessage } from "api/api.errors";

export class BidSocketController extends SocketController {
  constructor(
    private readonly bidService: BidService,
    private readonly authService: AuthService,
    private readonly auctionService: AuctionService
  ) {
    super("bids");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(`${this.namespace}:create_bid`, this.handleCreateBid(socket));
  }

  private handleCreateBid = (socket: Socket) => {
    return async (rawPayload: unknown) => {
      try {
        const user = await this.authService.extractUserFromCookie(socket.handshake.headers.cookie);

        const payload = createBidSchema.parse(rawPayload);
        const newBid = await this.bidService.createBid(user, payload);

        const auctionBid = await this.bidService.getAuctionBid(newBid.id);

        //@dev sends event to everyone EXCEPT sender
        socket
          .to(this.auctionService.getAuctionRoomName("auctions", newBid.auction_id))
          .emit(`${this.namespace}:bid_created`, formatResponse(auctionBid));

        //@dev sends event ONLY to sender
        socket.emit(`${this.namespace}:bid_created`, formatResponse(auctionBid));
      } catch (error) {
        socket.emit(`${this.namespace}:create_bid_failed`, {
          message: getErrorMessage(error)
        });
      }
    };
  };
}
