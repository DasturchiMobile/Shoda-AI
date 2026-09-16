import { api } from "./client";

export type IgStatus = {
  connected: boolean;
  username: string;
  display_name: string;
  last_error: string;
  connected_at?: string | null;
};

export type IgConnectResult =
  | { ok: true; username: string; display_name: string }
  | { challenge_required: true; challenge_type: "2fa" | "challenge"; message: string }
  | { manual_challenge: true; message: string };

export const instagramApi = {
  status: async (): Promise<IgStatus> =>
    (await api.get("/instagram/status")).data,

  /** Step 1: username + password */
  connect: (username: string, password: string): Promise<IgConnectResult> =>
    api.post("/instagram/connect", { username, password }).then((r) => r.data),

  /** Step 2: verification / challenge code */
  verifyChallenge: (code: string): Promise<{ ok: true; username: string }> =>
    api.post("/instagram/verify-challenge", { code }).then((r) => r.data),

  /** Check if phone approval was completed */
  checkApproval: (): Promise<{ ok: true; username: string; display_name: string }> =>
    api.post("/instagram/check-approval").then((r) => r.data),

  /** Import existing session JSON from local instagrapi */
  uploadSession: (username: string, session_json: string): Promise<{ ok: true; username: string; display_name: string }> =>
    api.post("/instagram/upload-session", { username, session_json }).then((r) => r.data),

  disconnect: () => api.post("/instagram/disconnect").then((r) => r.data),
};
