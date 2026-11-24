import { Socket } from "socket.io";
import { createBidSchema } from "./bids.validation";
import { SocketController } from "api/api.controllers";
import { BidsService } from "./bids.service";
import { formatResponse } from "api/api.formats";
import { getErrorMessage } from "api/api.errors";
import { Auth } from "auth/auth.model";

export class BidsSocketController extends SocketController {
  constructor(private readonly bidsService: BidsService) {
    super("bids");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(`${this.namespace}:create_bid`, this.handleCreateBid(socket));
  }

  private handleCreateBid = (socket: Socket) => {
    return async (rawPayload: unknown) => {
      try {
        const payload = createBidSchema.parse(rawPayload);
        const userId = Auth.extractUserIdFromSocket(socket);
        const newBid = await this.bidsService.createBid(userId, payload);

        //@dev sends event to everyone EXCEPT sender
        socket
          .to(`auctions-${newBid.auction_id}`)
          .emit(`${this.namespace}:bid_created`, formatResponse(newBid));

        //@dev sends event ONLY to sender
        socket.emit(`${this.namespace}:bid_created`, formatResponse(newBid));
      } catch (error) {
        //@dev sends event ONLY to sender
        socket.emit(`${this.namespace}:create_bid_failed`, {
          message: getErrorMessage(error)
        });
      }
    };
  };
}
