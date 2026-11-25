import { AppEvents, EventBus } from "events/events.bus";
import { EmbeddingsService } from "interfaces/embeddings.interface";
import { MailService } from "interfaces/mail.interface";
import { ProductsRepository } from "./products.repository";
import { ProductsMailer } from "./products.mailer";

export class ProductsListener {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly embeddingsService: EmbeddingsService,
    private readonly mailService: MailService
  ) {}

  public register(eventBus: EventBus) {
    eventBus.on("product.created", this.attachEmbedding);
    eventBus.on("product.created", this.notifyOwner);
  }

  private attachEmbedding = async ({ product }: AppEvents["product.created"]) => {
    const embedding = await this.embeddingsService.generateEmbeddings(product.description);
    await this.productsRepository.attachEmbedding(product.id, embedding);
  };

  private notifyOwner = async ({ product, mailTo }: AppEvents["product.created"]) => {
    await this.mailService.sendEmail({
      to: mailTo,
      ...ProductsMailer.createProductTemplate(product)
    });
  };
}
