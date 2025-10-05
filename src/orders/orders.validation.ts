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

export const orderSchema = z.object({
  id: z.number().int().positive(),
  buyer_id: z.number().int().positive(),
  status: z.enum(Object.values(OrderStatus)),
  created_at: z.date(),
  updated_at: z.date()
});
export type Order = z.infer<typeof orderSchema>;

export const orderDetailSchema = z.object({
  id: z.number().int().positive(),
  order_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive()
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const orderWithOrderDetailsSchema = z.object({
  id: z.number().int().positive(),
  buyer_id: z.number().int().positive(),
  order_details: z.array(orderDetailSchema),
  created_at: z.date(),
  updated_at: z.date()
});
export type OrderWithOrderDetails = z.infer<typeof orderWithOrderDetailsSchema>;
