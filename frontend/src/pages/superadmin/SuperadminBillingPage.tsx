import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { billingApi, type BillingRow } from "../../api/billing";
import { Wallet, Plus, ToggleLeft, ToggleRight, X, History } from "lucide-react";

function fmt(n: number, dp = 4) { return `$${(n || 0).toFixed(dp)}`; }
function fmtInt(n: number) { return new Intl.NumberFormat().format(n || 0); }

export function SuperadminBillingPage() {
  const qc = useQueryClient();
  const { data = [] } = useQuery<BillingRow[]>({ queryKey: ["sa-billing"], queryFn: billingApi.saList });
  const [topupOrg, setTopupOrg] = useState<BillingRow | null>(null);
  const [ledgerOrg, setLedgerOrg] = useState<BillingRow | null>(null);
  const { data: ledger = [] } = useQuery({ queryKey: ["sa-ledger", ledgerOrg?.org_id], queryFn: () => ledgerOrg ? billingApi.saLedger(ledgerOrg.org_id) : Promise.resolve([]), enabled: !!ledgerOrg });
  const [amount, setAmount] = useState("10");
  const [note, setNote] = useState("");

  const topupMut = useMutation({
    mutationFn: () => billingApi.saTopup(topupOrg!.org_id, parseFloat(amount), note),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sa-billing"] }); setTopupOrg(null); setAmount("10"); setNote(""); },
  });

  const subMut = useMutation({
    mutationFn: (p: { org_id: number; active: boolean }) => billingApi.saSetSub(p.org_id, { subscription_active: p.active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa-billing"] }),
  });

  const tariffMut = useMutation({
    mutationFn: (p: { org_id: number; tariff: "free" | "paid" }) => billingApi.saSetSub(p.org_id, { tariff: p.tariff }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa-billing"] }),
  });

  const feeMut = useMutation({
    mutationFn: (p: { org_id: number; fee: number }) => billingApi.saSetSub(p.org_id, { monthly_fee_usd: p.fee }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa-billing"] }),
  });

  const totalBalance = data.reduce((s, r) => s + r.balance_usd, 0);
  const totalSpent = data.reduce((s, r) => s + r.total_spent_usd, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Balanslar</h1>
        <p className="mt-0.5 text-[13px] text-ink-subtle">Tashkilotlar balansi va Gemini token sarfi (10% markup)</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="surface p-4">
          <div className="text-[11px] uppercase tracking-wider text-ink-subtle">Jami balans</div>
          <div className="mt-1 text-[22px] font-semibold text-ink">{fmt(totalBalance, 2)}</div>
        </div>
        <div className="surface p-4">
          <div className="text-[11px] uppercase tracking-wider text-ink-subtle">Jami sarflangan</div>
          <div className="mt-1 text-[22px] font-semibold text-ink">{fmt(totalSpent, 4)}</div>
        </div>
        <div className="surface p-4">
          <div className="text-[11px] uppercase tracking-wider text-ink-subtle">Tashkilotlar</div>
          <div className="mt-1 text-[22px] font-semibold text-ink">{data.length}</div>
        </div>
      </div>

      <div className="surface overflow-hidden">
        <table className="w-full text-[13px]">
          <thead>
            <tr style={{ borderBottom: "1px solid var(--divider)" }}>
              <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Tashkilot</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Balans</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Oylik ($)</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Sarflandi</th>
              <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Tokenlar (in/out)</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Tarif</th>
              <th className="px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Obuna</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.org_id} style={{ borderBottom: "1px solid var(--divider)" }}>
                <td className="px-4 py-3">
                  <div className="font-medium text-ink">{r.org_name}</div>
                  <div className="text-[11px] text-ink-subtle">#{r.org_id}</div>
                </td>
                <td className="px-4 py-3 text-right font-mono" style={{ color: r.balance_usd > 0 ? "var(--ink)" : "var(--danger)" }}>
                  {fmt(r.balance_usd, 4)}
                </td>
                <td className="px-4 py-3 text-right">
                  <input type="number" step="0.01" defaultValue={r.monthly_fee_usd}
                    onBlur={(e) => { const v = parseFloat(e.target.value); if (v !== r.monthly_fee_usd) feeMut.mutate({ org_id: r.org_id, fee: v }); }}
                    className="w-20 px-2 py-1 text-[12px] text-right" />
                </td>
                <td className="px-4 py-3 text-right font-mono text-ink-subtle">{fmt(r.total_spent_usd, 4)}</td>
                <td className="px-4 py-3 text-right font-mono text-[11px] text-ink-subtle">
                  {fmtInt(r.total_input_tokens)} / {fmtInt(r.total_output_tokens)}
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => tariffMut.mutate({ org_id: r.org_id, tariff: r.tariff === "free" ? "paid" : "free" })}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: r.tariff === "free" ? "rgba(148,163,184,0.15)" : "var(--brand-soft)",
                      color: r.tariff === "free" ? "var(--ink-muted)" : "var(--brand)"
                    }}>
                    {r.tariff === "free" ? "Free (o'z kaliti)" : "Paid (bizning kalit)"}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => subMut.mutate({ org_id: r.org_id, active: !r.subscription_active })}>
                    {r.subscription_active
                      ? <ToggleRight size={22} style={{ color: "var(--success)" }} />
                      : <ToggleLeft size={22} style={{ color: "var(--ink-subtle)" }} />}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1.5">
                    <button onClick={() => setLedgerOrg(r)} title="Tarix"
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px]"
                      style={{ backgroundColor: "var(--raised)", color: "var(--ink)" }}>
                      <History size={12} /> Tarix
                    </button>
                    <button onClick={() => setTopupOrg(r)}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[12px] btn-primary">
                      <Plus size={12} /> Pul qo'shish
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {data.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-ink-subtle">Tashkilotlar yo'q</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {topupOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-md rounded-lg" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--divider)" }}>
              <h3 className="text-[15px] font-semibold text-ink">Balans to'ldirish — {topupOrg.org_name}</h3>
              <button onClick={() => setTopupOrg(null)} className="text-ink-subtle hover:text-ink"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-[12px] text-ink-subtle">
                Hozirgi balans: <span className="font-mono text-ink">{fmt(topupOrg.balance_usd, 4)}</span>
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Miqdor (USD)</label>
                <input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 text-[14px]" />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Izoh (ixtiyoriy)</label>
                <input value={note} onChange={(e) => setNote(e.target.value)}
                  placeholder="Payme orqali to'landi" className="w-full px-3 py-2 text-[13px]" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setTopupOrg(null)} className="h-8 px-3 text-[13px] text-ink-subtle">Bekor</button>
                <button onClick={() => topupMut.mutate()} disabled={topupMut.isPending || !amount}
                  className="h-8 rounded-md px-3 text-[13px] font-medium btn-primary disabled:opacity-50">
                  {topupMut.isPending ? "..." : "To'ldirish"}
                </button>
              </div>
              {topupMut.isError && <p className="text-[12px]" style={{ color: "var(--danger)" }}>Xato: {(topupMut.error as any)?.response?.data?.detail || "urinib bo'lmadi"}</p>}
            </div>
          </div>
        </div>
      )}

      {ledgerOrg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-lg flex flex-col" style={{ backgroundColor: "var(--surface)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between p-4" style={{ borderBottom: "1px solid var(--divider)" }}>
              <h3 className="text-[15px] font-semibold text-ink">To'lov tarixi — {ledgerOrg.org_name}</h3>
              <button onClick={() => setLedgerOrg(null)} className="text-ink-subtle hover:text-ink"><X size={18} /></button>
            </div>
            <div className="p-4 overflow-auto flex-1">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--divider)" }}>
                    <th className="px-2 py-2 text-left text-[11px] uppercase tracking-wider text-ink-subtle">Sana</th>
                    <th className="px-2 py-2 text-left text-[11px] uppercase tracking-wider text-ink-subtle">Tur</th>
                    <th className="px-2 py-2 text-left text-[11px] uppercase tracking-wider text-ink-subtle">Izoh</th>
                    <th className="px-2 py-2 text-right text-[11px] uppercase tracking-wider text-ink-subtle">Miqdor</th>
                    <th className="px-2 py-2 text-right text-[11px] uppercase tracking-wider text-ink-subtle">Balans</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((r: any) => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--divider)" }}>
                      <td className="px-2 py-1.5 text-[12px] text-ink-subtle">{r.created_at ? new Date(r.created_at).toLocaleString("uz") : ""}</td>
                      <td className="px-2 py-1.5">
                        <span className="rounded px-1.5 py-0.5 text-[10.5px]"
                          style={{ backgroundColor: r.kind === "topup" ? "rgba(74,222,128,0.12)" : "var(--raised)",
                            color: r.kind === "topup" ? "var(--success)" : "var(--ink-muted)" }}>
                          {r.kind}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-[12px] text-ink-subtle truncate max-w-[280px]">
                        {r.note}
                        {r.model && <span className="ml-1 rounded bg-raised px-1 text-[10px]">{r.model}</span>}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[12px]"
                        style={{ color: r.amount_usd >= 0 ? "var(--success)" : "var(--ink)" }}>
                        {r.amount_usd >= 0 ? "+" : ""}{fmt(r.amount_usd, 6)}
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono text-[12px] text-ink-subtle">{fmt(r.balance_after, 4)}</td>
                    </tr>
                  ))}
                  {ledger.length === 0 && <tr><td colSpan={5} className="px-2 py-10 text-center text-ink-subtle">Tarix bo'sh</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}