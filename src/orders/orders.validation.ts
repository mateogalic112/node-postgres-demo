import { z } from "zod";

export enum OrderStatus {
  PENDING = "pending",
  PAID = "paid",
  FAILED = "failed"
}

export const createOrderSchema = z.object({
  line_items: z.array(
    z.object({
      product_id: z.number().int().positive(),
      quantity: z.number().int().positive()
    })
  )
});
export type CreateOrderPayload = z.infer<typeof createOrderSchema>;

export const createdOrderSchema = z.object({
  id: z.number().int().positive(),
  buyer_id: z.number().int().positive(),
  status: z.enum(Object.values(OrderStatus)),
  created_at: z.date(),
  updated_at: z.date()
});
export type CreatedOrder = z.infer<typeof createdOrderSchema>;

export const createOrderDetailSchema = z.object({
  id: z.number().int().positive(),
  order_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive()
});
export type CreateOrderDetailPayload = z.infer<typeof createOrderDetailSchema>;

export const orderSchema = z.object({
  id: z.number().int().positive(),
  buyer_id: z.number().int().positive(),
  order_details: z.array(createOrderDetailSchema),
  created_at: z.date(),
  updated_at: z.date()
});
export type Order = z.infer<typeof orderSchema>;
