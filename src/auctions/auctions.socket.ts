import { Socket } from "socket.io";
import { SocketController } from "api/api.controllers";
import { auctionRoomSchema } from "./auctions.validation";
import { AuctionsService } from "./auctions.service";
import { getErrorMessage } from "api/api.errors";

export class AuctionsSocketController extends SocketController {
  constructor(private readonly auctionsService: AuctionsService) {
    super("auctions");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(`${this.namespace}:join_auction`, this.handleJoinAuction(socket));
    socket.on(`${this.namespace}:leave_auction`, this.handleLeaveAuction(socket));
  }

  private handleJoinAuction(socket: Socket) {
    return async (payload: unknown) => {
      try {
        const { auction_id } = auctionRoomSchema.parse(payload);
        await socket.join(this.auctionsService.getAuctionRoomName(this.namespace, auction_id));
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
        const auctionRoom = this.auctionsService.getAuctionRoomName(this.namespace, auction_id);
        await socket.leave(auctionRoom);
        socket.emit(`${this.namespace}:auction_left`, { auction_id });
      } catch (error) {
        socket.emit(`${this.namespace}:leave_auction_failed`, { message: getErrorMessage(error) });
      }
    };
  }
}
