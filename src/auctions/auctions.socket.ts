import { Socket } from "socket.io";
import { SocketController } from "api/api.controllers";
import { AuthService } from "auth/auth.service";
import { HttpError } from "api/api.errors";
import { joinAuctionSchema } from "./auctions.validation";

export class AuctionSocketController extends SocketController {
  private socket: Socket | null = null;

  constructor(private readonly authService: AuthService) {
    super("auctions");
  }

  public initializeEventHandlers(socket: Socket) {
    this.socket = socket;
    this.socket.on(`${this.namespace}:join`, this.handleJoinAuction.bind(this));
  }

  private async handleJoinAuction(payload: unknown) {
    if (!this.socket) return;
    try {
      await this.authService.extractUserFromCookie(this.socket.handshake.headers.cookie);

      const { auction_id } = joinAuctionSchema.parse(payload);

      this.socket.join(`auction-${auction_id}`);
    } catch (error) {
      this.socket.emit(`${this.namespace}:error`, { message: (error as HttpError).message });
    }
  }
}
