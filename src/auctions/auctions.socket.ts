import { Socket } from "socket.io";
import { SocketController } from "api/api.controllers";
import { HttpError } from "api/api.errors";
import { auctionRoomSchema } from "./auctions.validation";
import { AuctionService } from "./auctions.service";

enum AuctionEvent {
  JOIN_AUCTION = "JOIN_AUCTION",
  LEAVE_AUCTION = "LEAVE_AUCTION"
}

export class AuctionSocketController extends SocketController {
  private auctionEvents: Record<AuctionEvent, string> = {
    [AuctionEvent.JOIN_AUCTION]: `${this.namespace}:${AuctionEvent.JOIN_AUCTION.toLowerCase()}`,
    [AuctionEvent.LEAVE_AUCTION]: `${this.namespace}:${AuctionEvent.LEAVE_AUCTION.toLowerCase()}`
  };

  constructor(private readonly auctionService: AuctionService) {
    super("auctions");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(this.auctionEvents.JOIN_AUCTION, this.handleJoinAuction(socket));
    socket.on(this.auctionEvents.LEAVE_AUCTION, this.handleLeaveAuction(socket));
  }

  private handleJoinAuction(socket: Socket) {
    return async (payload: unknown) => {
      try {
        const { auction_id } = auctionRoomSchema.parse(payload);
        socket.join(this.auctionService.getAuctionRoomName(this.namespace, auction_id));
      } catch (error) {
        socket.emit(this.events.ERROR, { message: (error as HttpError).message });
      }
    };
  }

  private handleLeaveAuction(socket: Socket) {
    return async (payload: unknown) => {
      try {
        const { auction_id } = auctionRoomSchema.parse(payload);
        socket.leave(this.auctionService.getAuctionRoomName(this.namespace, auction_id));
      } catch (error) {
        socket.emit(this.events.ERROR, { message: (error as HttpError).message });
      }
    };
  }
}
