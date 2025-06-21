import { Socket } from "socket.io";
import { SocketController } from "api/api.controllers";
import { AuthService } from "auth/auth.service";
import { HttpError } from "api/api.errors";
import { joinAuctionSchema } from "./auctions.validation";

export class AuctionSocketController extends SocketController {
  constructor(private readonly authService: AuthService) {
    super("auctions");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(`${this.namespace}:join`, this.handleJoinAuction(socket));
  }

  private handleJoinAuction(socket: Socket) {
    return async (payload: unknown) => {
      try {
        await this.authService.extractUserFromCookie(socket.handshake.headers.cookie);

        const { auction_id } = joinAuctionSchema.parse(payload);

        socket.join(`auction-${auction_id}`);
      } catch (error) {
        socket.emit(`${this.namespace}:error`, { message: (error as HttpError).message });
      }
    };
  }
}
