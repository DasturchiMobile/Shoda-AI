import { api } from "./client";

export type OrgUser = { id: number; username: string; role: "admin" | "manager"; is_active: boolean };
export type UserIn = { username: string; password?: string; role: "admin" | "manager"; is_active?: boolean };

export const usersApi = {
  list: async (): Promise<OrgUser[]> => (await api.get("/users")).data,
  create: async (p: UserIn) => (await api.post("/users", p)).data,
  update: async (id: number, p: UserIn) => (await api.put(`/users/${id}`, p)).data,
  remove: async (id: number) => (await api.delete(`/users/${id}`)).data,
};
