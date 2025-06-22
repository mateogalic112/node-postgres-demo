import { Socket } from "socket.io";
import { SocketController } from "api/api.controllers";
import { AuthService } from "auth/auth.service";
import { HttpError } from "api/api.errors";
import { joinAuctionSchema } from "./auctions.validation";

enum AuctionEvent {
  JOIN_AUCTION = "JOIN_AUCTION"
}

export class AuctionSocketController extends SocketController {
  private auctionEvents: Record<AuctionEvent, string> = {
    [AuctionEvent.JOIN_AUCTION]: `${this.namespace}:${AuctionEvent.JOIN_AUCTION.toLowerCase()}`
  };

  constructor(private readonly authService: AuthService) {
    super("auctions");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(this.auctionEvents.JOIN_AUCTION, this.handleJoinAuction(socket));
  }

  private handleJoinAuction(socket: Socket) {
    return async (payload: unknown) => {
      try {
        await this.authService.extractUserFromCookie(socket.handshake.headers.cookie);

        const { auction_id } = joinAuctionSchema.parse(payload);

        socket.join(`auction-${auction_id}`);
      } catch (error) {
        socket.emit(this.events.ERROR, { message: (error as HttpError).message });
      }
    };
  }
}
