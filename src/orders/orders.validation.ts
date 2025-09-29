import { productSchema } from "products/products.validation";
import { userSchema } from "users/users.validation";
import { z } from "zod";

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
  created_at: z.date(),
  updated_at: z.date()
});

export const createOrderDetailSchema = z.object({
  id: z.number().int().positive(),
  order_id: z.number().int().positive(),
  product_id: z.number().int().positive(),
  quantity: z.number().int().positive(),
  total_price_in_cents: z.number().int().positive()
});
export type CreateOrderDetailPayload = z.infer<typeof createOrderDetailSchema>;

export const createOrderDetailsSchema = z.array(createOrderDetailSchema);

export const orderSchema = z.object({
  id: z.number().int().positive(),
  buyer_id: z.number().int().positive(),
  order_details: z.array(createOrderDetailSchema),
  created_at: z.date(),
  updated_at: z.date()
});
export type Order = z.infer<typeof orderSchema>;

export const orderDetailSchema = z.object({
  id: z.number().int().positive(),
  product: productSchema,
  quantity: z.number().int().positive(),
  total_price_in_cents: z.number().int().positive()
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const orderDetailsSchema = z.array(orderDetailSchema);

export const populatedOrderSchema = z.object({
  id: z.number().int().positive(),
  buyer: userSchema,
  order_details: z.array(orderDetailSchema),
  created_at: z.date(),
  updated_at: z.date()
});
export type PopulatedOrder = z.infer<typeof populatedOrderSchema>;
