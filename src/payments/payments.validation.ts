import { z } from "zod";

export const processOrderSchema = z.object({
  type: z.enum(["checkout.session.completed", "checkout.session.async_payment_succeeded"]),
  data: z.object({
    object: z.object({
      metadata: z.object({
        order_id: z.coerce.number()
      }),
      customer_details: z.object({
        email: z.email()
      })
    })
  })
});
