import { Socket } from "socket.io";
import { SocketController } from "api/api.controllers";
import { auctionRoomSchema } from "./auctions.validation";
import { getErrorMessage } from "api/api.errors";
import { Auth } from "auth/auth.model";

export class AuctionsSocketController extends SocketController {
  constructor() {
    super("auctions");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(`${this.namespace}:join_auction`, this.handleJoinAuction(socket));
    socket.on(`${this.namespace}:leave_auction`, this.handleLeaveAuction(socket));
  }

  private handleJoinAuction(socket: Socket) {
    return async (payload: unknown) => {
      try {
        Auth.extractUserIdFromSocket(socket);
        const { auction_id } = auctionRoomSchema.parse(payload);
        await socket.join(`${this.namespace}-${auction_id}`);
        socket.emit(`${this.namespace}:auction_joined`, { auction_id });
      } catch (error) {
        socket.emit(`${this.namespace}:join_auction_failed`, { message: getErrorMessage(error) });
      }
    };
  }

  private handleLeaveAuction(socket: Socket) {
    return async (payload: unknown) => {
      try {
        const { auction_id } = auctionRoomSchema.parse(payload);
        await socket.leave(`${this.namespace}-${auction_id}`);
        socket.emit(`${this.namespace}:auction_left`, { auction_id });
      } catch (error) {
        socket.emit(`${this.namespace}:leave_auction_failed`, { message: getErrorMessage(error) });
      }
    };
  }
}
