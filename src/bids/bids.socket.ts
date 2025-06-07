import { Socket } from "socket.io";
import { CreateBidPayload } from "./bids.validation";
import { SocketController } from "api/api.controllers";
import { BidService } from "./bid.service";
import { AuthService } from "auth/auth.service";
import { formatResponse } from "api/api.formats";

export class BidSocketController extends SocketController {
  private socket: Socket | null = null;

  constructor(
    private readonly bidService: BidService,
    private readonly authService: AuthService
  ) {
    super();
  }

  public initializeEventHandlers(socket: Socket) {
    this.socket = socket;
    this.socket.on("bid:create", this.handleCreateBid.bind(this));
  }

  private async handleCreateBid(payload: CreateBidPayload) {
    if (!this.socket) return;

    try {
      const user = await this.authService.extractUserFromCookie(
        this.socket.handshake.headers.cookie
      );

      const bid = await this.bidService.createBid({
        user,
        payload
      });
      this.socket.emit("bid:created", formatResponse(bid));
    } catch (error) {
      this.socket.emit("bid:error", { message: (error as Error).message });
    }
  }
}
