import { api } from "./client";

export type KSource = {
  id: number;
  name: string;
  kind: "text" | "url" | "file" | "telegram";
  content: string;
  url: string;
  chunks_count: number;
  is_active: boolean;
};

export type KSourceIn = Omit<KSource, "id" | "chunks_count">;

export type AskResponse = {
  answer: string;
  citations: { source_id: number; name: string; snippet: string; score: number }[];
};

export const knowledgeApi = {
  list: () => api.get<KSource[]>("/knowledge").then((r) => r.data),
  create: (data: KSourceIn) => api.post<KSource>("/knowledge", data).then((r) => r.data),
  update: (id: number, data: KSourceIn) => api.patch<KSource>(`/knowledge/${id}`, data).then((r) => r.data),
  remove: (id: number) => api.delete(`/knowledge/${id}`).then((r) => r.data),
  upload: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return api.post<KSource>("/knowledge/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data);
  },
  ask: (question: string, source_ids: number[]) =>
    api.post<AskResponse>("/knowledge/ask", { question, source_ids }).then((r) => r.data),
};
