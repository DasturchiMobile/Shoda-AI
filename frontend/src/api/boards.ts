import { api } from "./client";

export type Stage = {
  id: number; board_id: number; name: string; color: string;
  position: number; is_won: boolean; is_lost: boolean;
};

export type Board = {
  id: number; name: string; is_default: boolean; position: number;
  stages: Stage[];
};

export type StageIn = Omit<Stage, "id" | "board_id">;

export const boardsApi = {
  list: () => api.get<Board[]>("/boards").then(r => r.data),
  create: (name: string) => api.post<Board>("/boards", { name, is_default: false }).then(r => r.data),
  update: (id: number, name: string, is_default = false) => api.patch<Board>(`/boards/${id}`, { name, is_default }).then(r => r.data),
  remove: (id: number) => api.delete(`/boards/${id}`).then(r => r.data),
  createStage: (bid: number, data: StageIn) => api.post<Stage>(`/boards/${bid}/stages`, data).then(r => r.data),
  updateStage: (sid: number, data: StageIn) => api.patch<Stage>(`/boards/stages/${sid}`, data).then(r => r.data),
  deleteStage: (sid: number) => api.delete(`/boards/stages/${sid}`).then(r => r.data),
  reorderStages: (bid: number, stage_ids: number[]) => api.patch(`/boards/${bid}/reorder`, { stage_ids }).then(r => r.data),
};
