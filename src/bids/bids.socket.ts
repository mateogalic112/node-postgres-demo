import { Socket } from "socket.io";
import { createBidSchema } from "./bids.validation";
import { SocketController } from "api/api.controllers";
import { BidService } from "./bids.service";
import { AuthService } from "auth/auth.service";
import { formatResponse } from "api/api.formats";
import { AuctionService } from "auctions/auctions.service";
import { getErrorMessage } from "api/api.errors";

enum BidEvent {
  CREATE_BID = "CREATE_BID",
  BID_CREATED = "BID_CREATED"
}

export class BidSocketController extends SocketController {
  private bidEvents: Record<BidEvent, string> = {
    [BidEvent.CREATE_BID]: `${this.namespace}:${BidEvent.CREATE_BID.toLowerCase()}`,
    [BidEvent.BID_CREATED]: `${this.namespace}:${BidEvent.BID_CREATED.toLowerCase()}`
  };

  constructor(
    private readonly bidService: BidService,
    private readonly authService: AuthService,
    private readonly auctionService: AuctionService
  ) {
    super("bids");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(this.bidEvents.CREATE_BID, this.handleCreateBid(socket));
  }

  private handleCreateBid = (socket: Socket) => {
    return async (payload: unknown) => {
      try {
        const user = await this.authService.extractUserFromCookie(socket.handshake.headers.cookie);
        const newBid = await this.bidService.createBid(user, createBidSchema.parse(payload));

        //@dev sends event to everyone EXCEPT sender
        socket
          .to(this.auctionService.getAuctionRoomName("auctions", newBid.auction_id))
          .emit(this.bidEvents.BID_CREATED, formatResponse(newBid));

        //@dev sends event ONLY to sender
        socket.emit(this.bidEvents.BID_CREATED, formatResponse(newBid));
      } catch (error) {
        socket.emit(this.events.ERROR, {
          message: getErrorMessage(error)
        });
      }
    };
  };
}
