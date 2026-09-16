import { api } from "./client";

export type Category = { id: number; name: string; slug: string };

export const categoriesApi = {
  list: () => api.get<Category[]>("/categories").then((r) => r.data),
  create: (name: string) => api.post<Category>("/categories", { name }).then((r) => r.data),
  remove: (id: number) => api.delete(`/categories/${id}`).then((r) => r.data),
};
