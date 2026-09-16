import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { instagramApi } from "../api/instagram";
import { Send, MessageCircle, Instagram, Check, X, Loader2, Phone as PhoneIcon, KeyRound } from "lucide-react";
import { telegramApi, TgStatus } from "../api/telegram";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Modal } from "../ui/Modal";
import { Badge } from "../ui/Badge";

export function IntegrationsPage() {
  const qc = useQueryClient();
  const { data: status } = useQuery({ queryKey: ["tg-status"], queryFn: telegramApi.status });
  const [connectOpen, setConnectOpen] = useState(false);

  const disconnectMut = useMutation({
    mutationFn: () => telegramApi.disconnect(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tg-status"] }),
  });

  const testMut = useMutation({
    mutationFn: () => telegramApi.test(),
    onSuccess: () => alert("Sinov xabari 'Saved Messages'ga yuborildi ✓"),
    onError: (e: any) => alert("Xato: " + (e?.response?.data?.detail || e?.message)),
  });

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Integratsiyalar</h1>
        <p className="mt-0.5 text-[13px] text-muted">Mijozlar bilan bevosita ishlash uchun kanallar</p>
      </div>

      {/* Telegram */}
      <div className="card p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="h-12 w-12 rounded-lg bg-cyan-500/15 text-cyan-300 grid place-items-center">
              <Send size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="text-[15px] font-semibold text-ink">Telegram (shaxsiy hisob)</div>
                {status?.connected ? (
                  <Badge tone="success"><Check size={11} className="inline mr-0.5" /> Ulangan</Badge>
                ) : (
                  <Badge tone="neutral">Ulanmagan</Badge>
                )}
              </div>
              <p className="text-[12px] text-muted mt-0.5 max-w-xl">
                O'zingizning Telegram hisobingiz orqali mijozlar bilan gaplashadi. MTProto (Telethon).
                Har xabarga AI kontekst asosida javob beradi — matn, ovoz, rasm, fayl.
              </p>
              {status?.connected && (
                <div className="mt-3 flex items-center gap-3 text-[12px]">
                  <div className="h-9 w-9 rounded-full bg-brand/15 text-brand grid place-items-center text-[11px] font-semibold">
                    {(status.display_name || status.username || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-ink">{status.display_name || "—"}</div>
                    <div className="text-muted">
                      {status.username ? `@${status.username} · ` : ""}{status.phone}
                    </div>
                  </div>
                </div>
              )}
              {!!status?.last_error && (
                <div className="mt-2 text-[11.5px] text-red-400">Xato: {status.last_error}</div>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {status?.connected ? (
              <>
                <Button variant="ghost" onClick={() => testMut.mutate()} disabled={testMut.isPending}>
                  {testMut.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                  Sinov xabari
                </Button>
                <Button variant="ghost" onClick={() => {
                  if (confirm("Telegram ulanishni uzasizmi?")) disconnectMut.mutate();
                }}>Uzish</Button>
              </>
            ) : (
              <Button onClick={() => setConnectOpen(true)}>Ulash</Button>
            )}
          </div>
        </div>
      </div>

      {/* Instagram */}
      <InstagramCard />

      {/* WhatsApp — placeholder */}
      <div className="card p-5 opacity-60">
        <div className="flex items-start gap-3">
          <div className="h-12 w-12 rounded-lg bg-green-500/15 text-green-300 grid place-items-center">
            <MessageCircle size={22} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <div className="text-[15px] font-semibold text-ink">WhatsApp Business</div>
              <Badge tone="neutral">Tez orada</Badge>
            </div>
            <p className="text-[12px] text-muted mt-0.5">WhatsApp Business API orqali</p>
          </div>
        </div>
      </div>

      {connectOpen && (
        <TelegramConnectModal onClose={() => setConnectOpen(false)}
          onDone={() => { setConnectOpen(false); qc.invalidateQueries({ queryKey: ["tg-status"] }); }} />
      )}
    </div>
  );
}

function TelegramConnectModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [step, setStep] = useState<"phone" | "code" | "password">("phone");
  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const startMut = useMutation({
    mutationFn: (p: string) => telegramApi.start(p),
    onSuccess: () => { setErr(null); setStep("code"); },
    onError: (e: any) => setErr(e?.response?.data?.detail || e?.message),
  });

  const verifyMut = useMutation({
    mutationFn: ({ code, password }: { code: string; password?: string }) => telegramApi.verify(code, password),
    onSuccess: () => onDone(),
    onError: (e: any) => {
      const d = e?.response?.data?.detail;
      if (typeof d === "object" && d?.requires_password) {
        setErr(null);
        setStep("password");
      } else {
        setErr(typeof d === "string" ? d : (e?.message || "Xato"));
      }
    },
  });

  return (
    <Modal open={true} title="Telegram'ni ulash" onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Bekor</Button>
        {step === "phone" && (
          <Button onClick={() => startMut.mutate(phone)} disabled={startMut.isPending || phone.length < 10}>
            {startMut.isPending ? "Yuborilyapti…" : "Kodni yuborish"}
          </Button>
        )}
        {step === "code" && (
          <Button onClick={() => verifyMut.mutate({ code })} disabled={verifyMut.isPending || !code.trim()}>
            {verifyMut.isPending ? "Tekshirilyapti…" : "Tasdiqlash"}
          </Button>
        )}
        {step === "password" && (
          <Button onClick={() => verifyMut.mutate({ code, password })} disabled={verifyMut.isPending || !password}>
            {verifyMut.isPending ? "Kirilyapti…" : "Kirish"}
          </Button>
        )}
      </>}>
      <div className="space-y-4">
        {step === "phone" && (
          <>
            <div>
              <label className="text-xs text-muted mb-1 block flex items-center gap-1.5"><PhoneIcon size={12} /> Telefon raqam</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" autoFocus />
              <p className="mt-1 text-[11px] text-muted">Xalqaro format bilan: +998... Telegram ilovangizga kod yuboriladi.</p>
            </div>
          </>
        )}
        {step === "code" && (
          <>
            <div>
              <label className="text-xs text-muted mb-1 block">Kod (Telegram'dan kelgan)</label>
              <Input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="12345" autoFocus maxLength={7} />
              <p className="mt-1 text-[11px] text-muted">Telegram ilovangizdagi "Login codes" chatiga qarang.</p>
            </div>
          </>
        )}
        {step === "password" && (
          <>
            <div>
              <label className="text-xs text-muted mb-1 block flex items-center gap-1.5"><KeyRound size={12} /> 2FA parol</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Cloud password" autoFocus />
              <p className="mt-1 text-[11px] text-muted">Sizning Telegram hisobingizda 2 bosqichli tekshirish yoqilgan.</p>
            </div>
          </>
        )}
        {err && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{err}</div>
        )}
      </div>
    </Modal>
  );
}

function InstagramCard() {
  const qc = useQueryClient();
  const [openConnect, setOpenConnect] = useState(false);
  const { data: st } = useQuery({ queryKey: ["ig-status"], queryFn: instagramApi.status, refetchInterval: 5000 });
  const disc = useMutation({
    mutationFn: () => instagramApi.disconnect(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ig-status"] }),
  });
  return (
    <div className="card p-5">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-lg bg-pink-500/15 text-pink-300 grid place-items-center">
          <Instagram size={22} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-[15px] font-semibold text-ink">Instagram DM (shaxsiy hisob)</div>
            {st?.connected
              ? <Badge tone="success">✓ Ulangan</Badge>
              : <Badge tone="neutral">Ulanmagan</Badge>}
          </div>
          <p className="text-[12px] text-muted mt-0.5">
            Instagram akkountingiz DM'lariga AI javob beradi. instagrapi (nofoydali) — akkount bloklanish xavfi bor.
          </p>
          {st?.connected && st.username && (
            <div className="mt-2 text-[12px] text-ink-subtle">@{st.username} · {st.display_name}</div>
          )}
        </div>
        <div>
          {st?.connected ? (
            <button onClick={() => { if(confirm("Instagram ulanishni uzasizmi?")) disc.mutate(); }}
              className="text-[13px] text-ink-subtle hover:text-red-400">Uzish</button>
          ) : (
            <button onClick={() => setOpenConnect(true)}
              className="rounded-md px-3 py-1.5 text-[13px] font-medium btn-primary">Ulash</button>
          )}
        </div>
      </div>
      {openConnect && <InstagramConnectModal onClose={() => setOpenConnect(false)}
        onDone={() => { setOpenConnect(false); qc.invalidateQueries({ queryKey: ["ig-status"] }); }} />}
    </div>
  );
}

/**
 * Two-step Instagram connect modal:
 *   step "creds"     → username + password  → POST /connect
 *   step "challenge" → verification code    → POST /verify-challenge
 *   step "manual"    → open Instagram app to approve
 *   tab  "session"   → paste raw instagrapi session JSON → POST /upload-session
 */
function InstagramConnectModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [tab, setTab] = useState<"login" | "session">("login");
  const [step, setStep] = useState<"creds" | "challenge" | "manual">("creds");
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [code, setCode] = useState("");
  const [challengeMsg, setChallengeMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Session import state
  const [sessUsername, setSessUsername] = useState("");
  const [sessJson, setSessJson] = useState("");

  // Step 1: credentials
  const submitCreds = async () => {
    if (!username.trim() || !password) return;
    setErr(""); setBusy(true);
    try {
      const res = await instagramApi.connect(username.trim(), password);
      if ("manual_challenge" in res && res.manual_challenge) {
        setChallengeMsg(res.message);
        setStep("manual");
      } else if ("challenge_required" in res && res.challenge_required) {
        setChallengeMsg(res.message);
        setStep("challenge");
      } else {
        onDone();
      }
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Xato");
    } finally {
      setBusy(false);
    }
  };

  // Step 2: verification code
  const submitCode = async () => {
    if (!code.trim()) return;
    setErr(""); setBusy(true);
    try {
      await instagramApi.verifyChallenge(code.trim());
      onDone();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Xato");
    } finally {
      setBusy(false);
    }
  };

  // Step 3: check approval after user approved on phone
  const submitApproval = async () => {
    setErr(""); setBusy(true);
    try {
      await instagramApi.checkApproval();
      onDone();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Xato");
    } finally {
      setBusy(false);
    }
  };

  // Session upload
  const submitSession = async () => {
    if (!sessUsername.trim() || !sessJson.trim()) return;
    setErr(""); setBusy(true);
    try {
      await instagramApi.uploadSession(sessUsername.trim(), sessJson.trim());
      onDone();
    } catch (e: any) {
      setErr(e?.response?.data?.detail || e?.message || "Xato");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-lg rounded-lg" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>

        {/* Header */}
        <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--divider)" }}>
          <h3 className="text-[15px] font-semibold text-ink">
            {tab === "login"
              ? (step === "creds" ? "Instagram'ni ulash"
                : step === "challenge" ? "Tasdiqlash kodi"
                : "Ilovadan tasdiqlang")
              : "Session yuklash"}
          </h3>
          <button onClick={onClose} className="text-ink-subtle hover:text-ink">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b" style={{ borderColor: "var(--divider)" }}>
          {(["login", "session"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setErr(""); }}
              className="px-4 py-2 text-[13px] font-medium transition-colors"
              style={{
                color: tab === t ? "var(--brand)" : "var(--ink-subtle)",
                borderBottom: tab === t ? "2px solid var(--brand)" : "2px solid transparent",
              }}
            >
              {t === "login" ? "Login" : "Session yuklash"}
            </button>
          ))}
        </div>

        <div className="p-4 space-y-3">

          {/* ── TAB: Login ──────────────────────────────────────────────── */}
          {tab === "login" && (
            <>
              {/* Step 1: credentials */}
              {step === "creds" && (
                <>
                  <div className="rounded-md p-2 text-[11.5px]" style={{ backgroundColor: "rgba(251,191,36,0.12)", color: "#fbbf24" }}>
                    ⚠ Diqqat: norasmiy API (instagrapi). Test akkount ishlatishingiz tavsiya etiladi.
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-subtle">Instagram username</label>
                    <input
                      value={username}
                      onChange={(e) => setU(e.target.value)}
                      placeholder="my_business"
                      autoFocus
                      onKeyDown={(e) => e.key === "Enter" && submitCreds()}
                      className="w-full px-3 py-2 text-[13px] rounded border"
                      style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--ink)" }}
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-subtle">Parol</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setP(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && submitCreds()}
                      className="w-full px-3 py-2 text-[13px] rounded border"
                      style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--ink)" }}
                    />
                  </div>
                </>
              )}

              {/* Step 2: challenge / 2FA code */}
              {step === "challenge" && (
                <>
                  <div className="rounded-md p-3 text-[12px]" style={{ backgroundColor: "rgba(99,102,241,0.1)", color: "var(--ink)" }}>
                    📩 {challengeMsg || "SMS yoki Authenticator app'dan kelgan 6 xonali kodni kiriting."}
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-subtle">Tasdiqlash kodi</label>
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                      placeholder="123456"
                      autoFocus
                      maxLength={8}
                      onKeyDown={(e) => e.key === "Enter" && submitCode()}
                      className="w-full px-3 py-2 text-[13px] rounded border tracking-widest text-center text-lg font-mono"
                      style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--ink)" }}
                    />
                  </div>
                  <button onClick={() => { setStep("creds"); setErr(""); setCode(""); }} className="text-[12px] text-muted hover:text-ink">
                    ← Orqaga
                  </button>
                </>
              )}

              {/* Step 3: manual — phone approval requested */}
              {step === "manual" && (
                <div className="space-y-4 py-1">
                  <div className="rounded-lg p-4 bg-pink-500/10 border border-pink-500/20 text-center space-y-2">
                    <div className="text-3xl">📱</div>
                    <p className="text-[14px] font-semibold text-ink">Telefondagi so'rovni tasdiqlang</p>
                    <div className="text-[12.5px] text-muted text-left space-y-1.5 pt-1 max-w-sm mx-auto">
                      <p><b>1.</b> Telefoningizdagi Instagram bildirishnomasini oching.</p>
                      <p><b>2.</b> <b>"Approve / Bu men"</b> tugmasini bosing.</p>
                      <p><b>3.</b> Tasdiqlaganingizdan so'ng pastdagi <b>"✅ Tasdiqladim"</b> tugmasini bosing.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-3 text-[12px] pt-1">
                    <button
                      onClick={() => { setStep("challenge"); setErr(""); }}
                      className="text-brand hover:underline"
                    >
                      Kod orqali kiritish →
                    </button>
                    <span className="text-muted">·</span>
                    <button
                      onClick={() => { setTab("session"); setErr(""); }}
                      className="text-muted hover:text-ink hover:underline"
                    >
                      Session yuklash
                    </button>
                  </div>
                  <button onClick={() => { setStep("creds"); setErr(""); }} className="text-[12px] text-muted hover:text-ink block">← Orqaga</button>
                </div>
              )}

            </>
          )}

          {/* ── TAB: Session yuklash ────────────────────────────────────── */}
          {tab === "session" && (
            <>
              <div className="rounded-md p-3 text-[12px] leading-relaxed space-y-1" style={{ backgroundColor: "rgba(99,102,241,0.08)", color: "var(--ink-subtle)" }}>
                <p className="font-semibold text-ink">Mahalliy kompyuterda bajarish:</p>
                <pre className="text-[11px] overflow-x-auto rounded p-2 mt-1" style={{ backgroundColor: "var(--surface-2)", color: "var(--ink)" }}>{`pip install instagrapi
python3 -c "
from instagrapi import Client
import json
cl = Client()
cl.login('USERNAME', 'PASSWORD')
print(json.dumps(cl.get_settings()))
"`}</pre>
                <p>Chiqgan JSON'ni pastga joylashtiring.</p>
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-subtle">Instagram username</label>
                <input
                  value={sessUsername}
                  onChange={(e) => setSessUsername(e.target.value)}
                  placeholder="my_business"
                  autoFocus
                  className="w-full px-3 py-2 text-[13px] rounded border"
                  style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--ink)" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] uppercase tracking-wider text-ink-subtle">Session JSON</label>
                <textarea
                  value={sessJson}
                  onChange={(e) => setSessJson(e.target.value)}
                  placeholder='{"uuids": {...}, "device_settings": {...}, ...}'
                  rows={5}
                  className="w-full px-3 py-2 text-[11px] rounded border font-mono resize-y"
                  style={{ backgroundColor: "var(--surface-2)", borderColor: "var(--border)", color: "var(--ink)" }}
                />
              </div>
            </>
          )}

          {/* Error */}
          {err && (
            <div className="rounded-md px-3 py-2 text-[12px]" style={{ backgroundColor: "rgba(239,68,68,0.1)", color: "var(--danger)" }}>
              {err}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button onClick={onClose} className="h-8 px-3 text-[13px] text-ink-subtle">Bekor</button>
            {tab === "login" && step === "creds" && (
              <button
                onClick={submitCreds}
                disabled={busy || !username.trim() || !password}
                className="h-8 rounded-md px-4 text-[13px] font-medium btn-primary disabled:opacity-50"
              >
                {busy ? "Tekshirilyapti…" : "Kirish"}
              </button>
            )}
            {tab === "login" && step === "challenge" && (
              <button
                onClick={submitCode}
                disabled={busy || code.length < 4}
                className="h-8 rounded-md px-4 text-[13px] font-medium btn-primary disabled:opacity-50"
              >
                {busy ? "Tekshirilyapti…" : "Tasdiqlash"}
              </button>
            )}
            {tab === "login" && step === "manual" && (
              <button
                onClick={submitApproval}
                disabled={busy}
                className="h-8 rounded-md px-4 text-[13px] font-medium btn-primary disabled:opacity-50"
              >
                {busy ? "Tekshirilyapti…" : "✅ Tasdiqladim"}
              </button>
            )}
            {tab === "session" && (
              <button
                onClick={submitSession}
                disabled={busy || !sessUsername.trim() || sessJson.trim().length < 10}
                className="h-8 rounded-md px-4 text-[13px] font-medium btn-primary disabled:opacity-50"
              >
                {busy ? "Yuklanmoqda…" : "Sessiyani yuklash"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
