import { api } from "./client";

export type TgStatus = {
  connected: boolean;
  phone: string;
  username: string;
  display_name: string;
  last_error: string;
  connected_at: string | null;
};

export const telegramApi = {
  status: () => api.get<TgStatus>("/telegram/status").then(r => r.data),
  start: (phone: string) => api.post("/telegram/connect/start", { phone }).then(r => r.data),
  verify: (code: string, password?: string) =>
    api.post("/telegram/connect/verify", { code, password: password || null }).then(r => r.data),
  disconnect: () => api.post("/telegram/disconnect").then(r => r.data),
  test: () => api.get("/telegram/test").then(r => r.data),
};
