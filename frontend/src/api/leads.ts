import { api } from "./client";

export type Lead = {
  id: number; name: string; phone: string;
  telegram_id: number | null; telegram_username: string;
  source: string; status: string;
  assigned_manager_id: number | null;
  notes: string; sale_value: number;
  last_message: string; last_activity_at: string | null; created_at: string;
  board_id: number | null; stage_id: number | null; position: number;
  total_cost_usd?: number; message_count?: number;
};

export type LeadIn = Partial<Omit<Lead, "id" | "last_message" | "last_activity_at" | "created_at" | "position">>;

export const leadsApi = {
  list: (params?: { board_id?: number; stage_id?: number; search?: string }) =>
    api.get<Lead[]>("/leads", { params }).then(r => r.data),
  get: (id: number) => api.get<Lead>(`/leads/${id}`).then(r => r.data),
  create: (data: LeadIn) => api.post<Lead>("/leads", data).then(r => r.data),
  update: (id: number, data: LeadIn) => api.patch<Lead>(`/leads/${id}`, data).then(r => r.data),
  move: (id: number, stage_id: number, position = 100) => api.patch<Lead>(`/leads/${id}/move`, { stage_id, position }).then(r => r.data),
  remove: (id: number) => api.delete(`/leads/${id}`).then(r => r.data),
  messages: (id: number) => api.get<any[]>(`/leads/${id}/messages`).then(r => r.data),
  addMessage: (id: number, content: string, role = "manager") =>
    api.post(`/leads/${id}/messages`, { content, role }).then(r => r.data),
  reply: (id: number, text: string) => api.post(`/leads/${id}/reply`, { text }).then(r => r.data),
};