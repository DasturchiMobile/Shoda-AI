import { api } from "./client";

export type ReqChannel = {
  id: number;
  username: string;
  title: string;
  invite_url: string;
  is_active: boolean;
  priority: number;
};

export type ReqChannelIn = Omit<ReqChannel, "id">;

export const channelsApi = {
  list: () => api.get<ReqChannel[]>("/required-channels").then((r) => r.data),
  create: (data: ReqChannelIn) => api.post<ReqChannel>("/required-channels", data).then((r) => r.data),
  update: (id: number, data: ReqChannelIn) => api.patch<ReqChannel>(`/required-channels/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/required-channels/${id}`).then((r) => r.data),
};
