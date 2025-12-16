export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  stockQuantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  category?: string;
  stockQuantity: number;
}

export interface UpdateProductInput {
  id: string;
  name?: string;
  description?: string;
  price?: number;
  category?: string;
  stockQuantity?: number;
}

export interface DeleteProductResponse {
  id: string;
  message: string;
}

export interface ProductMutationEvent {
  type: 'create' | 'update' | 'delete';
  product?: Product;
  deleteResponse?: DeleteProductResponse;
  timestamp: Date;
}
