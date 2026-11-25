import { AppEvents, EventBus } from "events/events.bus";
import { MailService } from "interfaces/mail.interface";
import { AuctionsMailer } from "./auctions.mailer";

export class AuctionsListener {
  constructor(private readonly mailService: MailService) {}

  public register(eventBus: EventBus) {
    eventBus.on("auction.created", this.notifyCreator);
  }

  private notifyCreator = async ({ auction, mailTo }: AppEvents["auction.created"]) => {
    await this.mailService.sendEmail({
      to: mailTo,
      ...AuctionsMailer.createAuctionTemplate(auction)
    });
  };
}
