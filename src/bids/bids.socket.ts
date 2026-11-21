import { Socket } from "socket.io";
import { createBidSchema } from "./bids.validation";
import { SocketController } from "api/api.controllers";
import { BidsService } from "./bids.service";
import { formatResponse } from "api/api.formats";
import { AuctionsService } from "auctions/auctions.service";
import { getErrorMessage, UnauthenticatedError } from "api/api.errors";
import { UsersRepository } from "users/users.repository";
import { Auth } from "auth/auth.model";

export class BidsSocketController extends SocketController {
  constructor(
    private readonly bidsService: BidsService,
    private readonly usersRepository: UsersRepository,
    private readonly auctionsService: AuctionsService
  ) {
    super("bids");
  }

  public initializeEventHandlers(socket: Socket) {
    socket.on(`${this.namespace}:create_bid`, this.handleCreateBid(socket));
  }

  private handleCreateBid = (socket: Socket) => {
    return async (rawPayload: unknown) => {
      try {
        const userId = await Auth.extractUserIdFromSocket(socket);
        const user = await this.usersRepository.findUserById(userId);
        if (!user) {
          throw new UnauthenticatedError("User not found!");
        }
        const payload = createBidSchema.parse(rawPayload);
        const newBid = await this.bidsService.createBid(user, payload);

        const auctionBid = await this.bidsService.getAuctionBid(newBid.id);

        //@dev sends event to everyone EXCEPT sender
        socket
          .to(this.auctionsService.getAuctionRoomName("auctions", newBid.auction_id))
          .emit(`${this.namespace}:bid_created`, formatResponse(auctionBid));

        //@dev sends event ONLY to sender
        socket.emit(`${this.namespace}:bid_created`, formatResponse(auctionBid));
      } catch (error) {
        socket.emit(`${this.namespace}:create_bid_failed`, {
          message: getErrorMessage(error)
        });
      }
    };
  };
}
