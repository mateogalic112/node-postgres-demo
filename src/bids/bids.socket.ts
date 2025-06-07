import { Socket } from "socket.io";
import { CreateBidPayload } from "./bids.validation";
import { SocketController } from "api/api.controllers";
import { BidService } from "./bid.service";
import { AuthService } from "auth/auth.service";

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
      const cookieHeader = this.socket.handshake.headers.cookie;
      if (!cookieHeader) {
        this.socket.emit("bid:error", { message: "Authentication required" });
        return;
      }

      const token = cookieHeader.split("Authentication=")[1];
      if (!token) {
        this.socket.emit("bid:error", { message: "Authentication required" });
        return;
      }

      const user = await this.authService.extractUserFromToken(token);
      if (!user) {
        this.socket.emit("bid:error", { message: "Authentication required" });
        return;
      }

      const bid = await this.bidService.createBid(user, payload);
      this.socket.emit("bid:created", bid);
    } catch (error) {
      this.socket.emit("bid:error", { message: (error as Error).message });
    }
  }
}
