import { Socket } from "socket.io";
import { SocketController } from "api/api.controllers";
import { auctionRoomSchema } from "./auctions.validation";
import { AuctionService } from "./auctions.service";
import { getErrorMessage } from "api/api.errors";

enum AuctionEvent {
  JOIN_AUCTION = "JOIN_AUCTION",
  LEAVE_AUCTION = "LEAVE_AUCTION",
  AUCTION_JOINED = "AUCTION_JOINED",
  AUCTION_LEFT = "AUCTION_LEFT"
}

export class AuctionSocketController extends SocketController {
  private auctionEvents: Record<AuctionEvent, string> = {
    [AuctionEvent.JOIN_AUCTION]: `${this.namespace}:${AuctionEvent.JOIN_AUCTION.toLowerCase()}`,
    [AuctionEvent.LEAVE_AUCTION]: `${this.namespace}:${AuctionEvent.LEAVE_AUCTION.toLowerCase()}`,
    [AuctionEvent.AUCTION_JOINED]: `${this.namespace}:${AuctionEvent.AUCTION_JOINED.toLowerCase()}`,
    [AuctionEvent.AUCTION_LEFT]: `${this.namespace}:${AuctionEvent.AUCTION_LEFT.toLowerCase()}`
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
        await socket.join(this.auctionService.getAuctionRoomName(this.namespace, auction_id));
        socket.emit(this.auctionEvents.AUCTION_JOINED, { auction_id });
      } catch (error) {
        socket.emit(this.events.ERROR, { message: getErrorMessage(error) });
      }
    };
  }

  private handleLeaveAuction(socket: Socket) {
    return async (payload: unknown) => {
      try {
        const { auction_id } = auctionRoomSchema.parse(payload);
        await socket.leave(this.auctionService.getAuctionRoomName(this.namespace, auction_id));
        socket.emit(this.auctionEvents.AUCTION_LEFT, { auction_id });
      } catch (error) {
        socket.emit(this.events.ERROR, { message: getErrorMessage(error) });
      }
    };
  }
}
