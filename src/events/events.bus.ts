import { EventEmitter } from "node:events";
import { getErrorMessage } from "api/api.errors";
import { LoggerService } from "interfaces/logger.interface";
import { Product } from "products/products.validation";

export interface AppEvents {
  "product.created": { product: Product; mailTo: string };
}

type EventHandler<T> = (payload: T) => Promise<void>;

export class EventBus {
  private readonly emitter = new EventEmitter();
  private readonly pending = new Set<Promise<void>>();

  constructor(private readonly logger: LoggerService) {}

  public emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]) {
    this.emitter.emit(event, payload);
  }

  public on<K extends keyof AppEvents>(event: K, handler: EventHandler<AppEvents[K]>) {
    // Handlers run detached from the request, so an unhandled rejection would crash the process.
    this.emitter.on(event, (payload: AppEvents[K]) => {
      const run = handler(payload)
        .catch((error) =>
          this.logger.error(`Handler for "${event}" failed: ${getErrorMessage(error)}`)
        )
        .finally(() => this.pending.delete(run));
      this.pending.add(run);
    });
  }

  public async settled() {
    await Promise.all(this.pending);
  }
}
