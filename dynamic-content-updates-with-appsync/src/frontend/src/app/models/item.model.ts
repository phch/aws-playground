export interface Item {
  id: number;
  name: string;
  description: string;
  quantity: number;
  value: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  count: number;
}
