import { Socket } from "socket.io";
import { createBidSchema } from "./bids.validation";
import { SocketController } from "api/api.controllers";
import { BidService } from "./bids.service";
import { AuthService } from "auth/auth.service";
import { formatResponse } from "api/api.formats";
import { AuctionService } from "auctions/auctions.service";
import { getErrorMessage } from "api/api.errors";
import { BidEvent, constructBidEvent } from "./bids.events";

export class BidSocketController extends SocketController {
  constructor(
    private readonly bidService: BidService,
    private readonly authService: AuthService,
    private readonly auctionService: AuctionService
  ) {
    super("bids");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(constructBidEvent(this.namespace, BidEvent.CREATE_BID), this.handleCreateBid(socket));
  }

  private handleCreateBid = (socket: Socket) => {
    return async (payload: unknown) => {
      try {
        const user = await this.authService.extractUserFromCookie(socket.handshake.headers.cookie);
        const newBid = await this.bidService.createBid(user, createBidSchema.parse(payload));
        const auctionBid = await this.bidService.getAuctionBid(newBid.id);

        //@dev sends event to everyone EXCEPT sender
        socket
          .to(this.auctionService.getAuctionRoomName("auctions", newBid.auction_id))
          .emit(
            constructBidEvent(this.namespace, BidEvent.BID_CREATED),
            formatResponse(auctionBid)
          );

        //@dev sends event ONLY to sender
        socket.emit(
          constructBidEvent(this.namespace, BidEvent.BID_CREATED),
          formatResponse(auctionBid)
        );
      } catch (error) {
        socket.emit(this.events.ERROR, {
          message: getErrorMessage(error)
        });
      }
    };
  };
}
