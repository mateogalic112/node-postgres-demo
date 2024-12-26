import { CreateProductPayload } from "./products.validation";
import { DBModel } from "interfaces/db.interface";

export interface Product extends DBModel, CreateProductPayload {}
