import { api } from "./client";

export type RegistrationRequest = {
  id: number;
  org_name: string;
  admin_name: string;
  contact_phone?: string;
  contact_telegram?: string;
  username: string;
  status: "pending" | "activated" | "rejected";
  requested_at?: string;
};

export type Tenant = {
  id: number;
  name: string;
  slug: string;
  status: string;
  user_count: number;
  product_count: number;
  created_at?: string;
};

export type SystemStats = {
  orgs_total: number;
  orgs_pending: number;
  users_total: number;
  products_total: number;
};

export type PlatformSettings = {
  id: number;
  gemini_api_key?: string;
  gemini_model?: string;
  telegram_api_id?: string;
  telegram_api_hash?: string;
  telegram_storage_channel_id?: string;
};

export const superadminApi = {
  registrations: (status = "pending") =>
    api.get<RegistrationRequest[]>("/superadmin/registrations", { params: { status } })
      .then((r) => r.data),
  activate: (id: number) => api.post(`/superadmin/registrations/${id}/activate`).then((r) => r.data),
  reject: (id: number) => api.post(`/superadmin/registrations/${id}/reject`).then((r) => r.data),
  tenants: () => api.get<Tenant[]>("/superadmin/tenants").then((r) => r.data),
  stats: () => api.get<SystemStats>("/superadmin/system-stats").then((r) => r.data),
  settings: () => api.get<PlatformSettings>("/superadmin/platform-settings").then((r) => r.data),
  updateSettings: (data: Partial<PlatformSettings>) =>
    api.put<PlatformSettings>("/superadmin/platform-settings", data).then((r) => r.data),
};
