import { Socket } from "socket.io";
import { createBidSchema } from "./bids.validation";
import { SocketController } from "api/api.controllers";
import { BidService } from "./bid.service";
import { AuthService } from "auth/auth.service";
import { formatResponse } from "api/api.formats";
import { HttpError } from "api/api.errors";

export class BidSocketController extends SocketController {
  private socket: Socket | null = null;

  constructor(
    private readonly bidService: BidService,
    private readonly authService: AuthService
  ) {
    super("bid");
  }

  public initializeEventHandlers(socket: Socket) {
    this.socket = socket;
    this.socket.on(`${this.namespace}:create`, this.handleCreateBid.bind(this));
  }

  private async handleCreateBid(payload: unknown) {
    if (!this.socket) return;

    try {
      const user = await this.authService.extractUserFromCookie(
        this.socket.handshake.headers.cookie
      );

      const bid = await this.bidService.createBid(user, createBidSchema.parse(payload));

      this.socket.emit(`${this.namespace}:created`, formatResponse(bid));
    } catch (error) {
      this.socket.emit(`${this.namespace}:error`, { message: (error as HttpError).message });
    }
  }
}
