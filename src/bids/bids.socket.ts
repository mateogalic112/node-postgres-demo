import { Socket } from "socket.io";
import { createBidSchema } from "./bids.validation";
import { SocketController } from "api/api.controllers";
import { BidService } from "./bids.service";
import { AuthService } from "auth/auth.service";
import { formatResponse } from "api/api.formats";
import { HttpError } from "api/api.errors";

enum BidEvent {
  ON_CREATE = "ON_CREATE",
  CREATED = "CREATED"
}

export class BidSocketController extends SocketController {
  private bidEvents: Record<BidEvent, string> = {
    [BidEvent.ON_CREATE]: `${this.namespace}:${BidEvent.ON_CREATE}`,
    [BidEvent.CREATED]: `${this.namespace}:${BidEvent.CREATED}`
  };

  constructor(
    private readonly bidService: BidService,
    private readonly authService: AuthService
  ) {
    super("bids");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(this.bidEvents.ON_CREATE, this.handleCreateBid(socket));
  }

  private handleCreateBid = (socket: Socket) => {
    return async (payload: unknown) => {
      try {
        const user = await this.authService.extractUserFromCookie(socket.handshake.headers.cookie);

        const newBid = await this.bidService.createBid(user, createBidSchema.parse(payload));

        socket
          .to(`auction-${newBid.auction_id}`)
          .emit(this.bidEvents.CREATED, formatResponse(newBid));

        socket.emit(this.bidEvents.CREATED, formatResponse(newBid));
      } catch (error) {
        socket.emit(this.events.ERROR, {
          message: (error as HttpError).message
        });
      }
    };
  };
}
