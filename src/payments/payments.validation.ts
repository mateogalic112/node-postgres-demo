import { z } from "zod";

export const SUPPORTED_EVENTS = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded"
];

export const processOrderSchema = z.object({
  type: z.enum(SUPPORTED_EVENTS),
  data: z.object({
    object: z.object({
      metadata: z.object({
        order_id: z.coerce.number()
      })
    })
  })
});
