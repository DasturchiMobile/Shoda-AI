import { api } from "./client";

export type Trigger = {
  id: number;
  name: string;
  keywords: string[];
  response_text: string;
  is_active: boolean;
  priority: number;
  required_channel_ids: number[];
};

export type TriggerIn = Omit<Trigger, "id">;

export const triggersApi = {
  list: () => api.get<Trigger[]>("/triggers").then((r) => r.data),
  create: (data: TriggerIn) => api.post<Trigger>("/triggers", data).then((r) => r.data),
  update: (id: number, data: TriggerIn) => api.patch<Trigger>(`/triggers/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/triggers/${id}`).then((r) => r.data),
};
