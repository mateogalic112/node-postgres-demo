import { Socket } from "socket.io";
import { createBidSchema } from "./bids.validation";
import { SocketController } from "api/api.controllers";
import { BidService } from "./bids.service";
import { AuthService } from "auth/auth.service";
import { formatResponse } from "api/api.formats";
import { HttpError } from "api/api.errors";

export class BidSocketController extends SocketController {
  constructor(
    private readonly bidService: BidService,
    private readonly authService: AuthService
  ) {
    super("bids");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(`${this.namespace}:create`, this.handleCreateBid(socket));
  }

  private handleCreateBid = (socket: Socket) => {
    return async (payload: unknown) => {
      try {
        const user = await this.authService.extractUserFromCookie(socket.handshake.headers.cookie);

        const newBid = await this.bidService.createBid(user, createBidSchema.parse(payload));

        socket
          .to(`auction-${newBid.auction_id}`)
          .emit(`${this.namespace}:created`, formatResponse(newBid));

        socket.emit(`${this.namespace}:created`, formatResponse(newBid));
      } catch (error) {
        socket.emit(`${this.namespace}:error`, { message: (error as HttpError).message });
      }
    };
  };
}
