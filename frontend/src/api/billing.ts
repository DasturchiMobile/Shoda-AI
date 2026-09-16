import { api } from "./client";

export type BillingRow = {
  org_id: number;
  org_name: string;
  balance_usd: number;
  monthly_fee_usd: number;
  subscription_active: boolean;
  tariff: "free" | "paid";
  subscription_until: string | null;
  total_input_tokens: number;
  total_output_tokens: number;
  total_spent_usd: number;
};

export type LedgerEntry = {
  id: number; kind: string; amount_usd: number; balance_after: number;
  note: string; input_tokens: number; output_tokens: number;
  model: string; created_at: string | null;
};

export type UsageModelRow = {
  provider: string; model: string;
  prompt_tokens: number; completion_tokens: number;
  cost_usd: number; calls: number;
};

export type UsageSummary = {
  prompt_tokens: number; completion_tokens: number; cost_usd: number; calls: number;
};

export type UsageResp = {
  today: { totals: UsageSummary; by_model: UsageModelRow[] };
  month: { totals: UsageSummary; by_model: UsageModelRow[] };
};

export type LeadCostRow = {
  id: number; lead_id: number; lead_name: string;
  provider: string; model: string;
  prompt_tokens: number; completion_tokens: number;
  cost_usd: number; used_platform_key: boolean; created_at: string | null;
};

export const billingApi = {
  // superadmin
  saList: async (): Promise<BillingRow[]> => (await api.get("/superadmin/billing")).data,
  saTopup: (org_id: number, amount_usd: number, note = "") =>
    api.post(`/superadmin/billing/${org_id}/topup`, { amount_usd, note }).then(r => r.data),
  saSetSub: (org_id: number, p: { monthly_fee_usd?: number; subscription_active?: boolean; tariff?: "free" | "paid" }) =>
    api.put(`/superadmin/billing/${org_id}/subscription`, p).then(r => r.data),
  saLedger: (org_id: number): Promise<LedgerEntry[]> =>
    api.get(`/superadmin/billing/${org_id}/ledger`).then(r => r.data),
  // admin
  my: async (): Promise<BillingRow> => (await api.get("/billing")).data,
  myLedger: (): Promise<LedgerEntry[]> => api.get("/billing/ledger").then(r => r.data),
  usage: (): Promise<UsageResp> => api.get("/billing/usage").then(r => r.data),
  leadCosts: (limit = 100): Promise<LeadCostRow[]> =>
    api.get(`/billing/lead-costs?limit=${limit}`).then(r => r.data),
};
