ALTER TABLE order_details
  ADD CONSTRAINT order_details_order_product_unique UNIQUE (order_id, product_id);
