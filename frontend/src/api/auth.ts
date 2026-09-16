import { api } from "./client";

export type Me = {
  id: number;
  username: string;
  role: "admin" | "manager" | "superadmin";
  org_id: number;
  org_name: string;
  org_status: string;
};

export type LoginResp = {
  access_token: string;
  role: Me["role"];
  org_id: number;
  username: string;
};

export const authApi = {
  login: (username: string, password: string) =>
    api.post<LoginResp>("/auth/login", { username, password }).then((r) => r.data),
  register: (data: {
    org_name: string;
    admin_name: string;
    username: string;
    password: string;
    contact_phone?: string;
    contact_telegram?: string;
  }) => api.post<LoginResp>("/auth/register", data).then((r) => r.data),
  me: () => api.get<Me>("/auth/me").then((r) => r.data),
};
