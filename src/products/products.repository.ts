import pool from "config/database";
import { Product } from "./products.model";

export class ProductRepository {
  public async getProducts() {
    const result = await pool.query<Product[]>("SELECT id, name, description, price FROM products");
    return result.rows;
  }
}
