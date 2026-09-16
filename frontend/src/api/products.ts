import { api } from "./client";

export type ProductImage = { id: number; url: string; position: number };

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  sku?: string | null;
  price: string | number;
  currency: string;
  in_stock: boolean;
  stock_qty?: number | null;
  is_active: boolean;
  source: string;
  images: ProductImage[];
};

export type ProductsPage = {
  items: Product[];
  total: number;
  page: number;
  per_page: number;
};

export type ProductFilters = {
  search?: string;
  category_id?: number | null;
  in_stock?: boolean | null;
  page?: number;
  per_page?: number;
};

export const productsApi = {
  list: (f: ProductFilters = {}) =>
    api.get<ProductsPage>("/products", {
      params: {
        search: f.search || undefined,
        category_id: f.category_id ?? undefined,
        in_stock: f.in_stock ?? undefined,
        page: f.page ?? 1,
        per_page: f.per_page ?? 24,
      },
    }).then((r) => r.data),
  create: (data: Partial<Product>) =>
    api.post<Product>("/products", data).then((r) => r.data),
  update: (id: number, data: Partial<Product>) =>
    api.patch<Product>(`/products/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/products/${id}`).then((r) => r.data),
  uploadImage: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<ProductImage>(`/products/${id}/images`, fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
  deleteImage: (pid: number, iid: number) =>
    api.delete(`/products/${pid}/images/${iid}`).then((r) => r.data),
};
