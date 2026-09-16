import { api } from "./client";

export interface Settings {
  system_prompt: string;
  ai_enabled: boolean;
  welcome_message: string;
  fallback_message: string;
  manager_username: string;

  gemini_api_key_set: boolean;
  gemini_model: string;
  ai_provider: string;
  groq_api_key_set: boolean;
  groq_model: string;
  openai_api_key_set: boolean;
  openai_model: string;
  claude_api_key_set: boolean;
  claude_model: string;
  ai_model: string;

  // for updates (write-only)
  gemini_api_key?: string;
  groq_api_key?: string;
  openai_api_key?: string;
  claude_api_key?: string;

  persona_name: string;
  persona_tone: string;
  persona_short: boolean;
  persona_we_form: boolean;
  persona_emoji: boolean;
  language: string;

  sales_aggressiveness: number;
  payment_mention: string;
  mention_discount: boolean;
  block_installment: boolean;
  push_leave_number: boolean;

  collect_name: boolean;
  collect_phone: boolean;
  collect_business: boolean;
  collect_budget: boolean;

  work_hours_enabled: boolean;
  work_hours_start: string;
  work_hours_end: string;
  after_hours_message: string;

  banned_words: string[];
  objections: any[];
  special_situations: any[];

  voice_reply_mode: string;
  uzbekvoice_api_key_set: boolean;
  uzbekvoice_api_key?: string;
}

export const settingsApi = {
  get: async (): Promise<Settings> => (await api.get("/settings")).data,
  update: async (p: Partial<Settings>): Promise<{ ok: true }> => (await api.put("/settings", p)).data,
  testGemini: async (p: { api_key?: string; model?: string }): Promise<{ ok: boolean; error?: string }> => (await api.post("/settings/test-gemini", p)).data,
  testGroq: async (p: { api_key?: string; model?: string }): Promise<{ ok: boolean; error?: string }> => (await api.post("/settings/test-groq", p)).data,
  testOpenai: async (p: { api_key?: string; model?: string }): Promise<{ ok: boolean; error?: string }> => (await api.post("/settings/test-openai", p)).data,
  testClaude: async (p: { api_key?: string; model?: string }): Promise<{ ok: boolean; error?: string }> => (await api.post("/settings/test-claude", p)).data,
  testVoice: async (p: { api_key?: string }): Promise<{ ok: boolean; error?: string }> => (await api.post("/settings/test-voice", p)).data,
  groqModels: async (): Promise<{ ok: boolean; models: string[]; error?: string }> => (await api.get("/settings/groq-models")).data,
};
