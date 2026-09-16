import { useQuery } from "@tanstack/react-query";
import {
  billingApi, type BillingRow, type LedgerEntry, type UsageResp, type LeadCostRow,
} from "../api/billing";
import { Wallet, ArrowDown, ArrowUp, Coins, Bot, Users } from "lucide-react";

function fmt(n: number, dp = 4) { return `$${(n || 0).toFixed(dp)}`; }
function fmtInt(n: number) { return new Intl.NumberFormat().format(n || 0); }

export function BillingPage() {
  const { data: b } = useQuery<BillingRow>({ queryKey: ["my-billing"], queryFn: billingApi.my });
  const { data: ledger = [] } = useQuery<LedgerEntry[]>({ queryKey: ["my-ledger"], queryFn: billingApi.myLedger });
  const { data: usage } = useQuery<UsageResp>({ queryKey: ["my-usage"], queryFn: billingApi.usage });
  const { data: leadCosts = [] } = useQuery<LeadCostRow[]>({ queryKey: ["my-lead-costs"], queryFn: () => billingApi.leadCosts(100) });

  const month = usage?.month.totals;
  const today = usage?.today.totals;
  const byModel = usage?.month.by_model ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[22px] font-semibold text-ink">Sarf-xarajatlar</h1>
        <p className="mt-0.5 text-[13px] text-ink-subtle">
          Token harajatlari va har bir lid uchun AI narxi. O'z API kalitingizdan foydalansangiz,
          to'lov to'g'ridan-to'g'ri provayder hisobingizdan yonadi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-subtle">
            <Wallet size={12} /> Platforma balansi
          </div>
          <div className="mt-1 text-[22px] font-semibold" style={{ color: (b?.balance_usd ?? 0) > 0 ? "var(--ink)" : "var(--ink-muted)" }}>
            {fmt(b?.balance_usd ?? 0, 4)}
          </div>
          <div className="mt-1 text-[11px] text-ink-subtle">Faqat platforma kalitida yongan sarf</div>
        </div>
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-subtle">
            <Coins size={12} /> Bu oy sarf
          </div>
          <div className="mt-1 text-[22px] font-semibold text-ink">{fmt(month?.cost_usd ?? 0, 4)}</div>
          <div className="mt-1 text-[11px] text-ink-subtle">{fmtInt(month?.calls ?? 0)} AI javob</div>
        </div>
        <div className="surface p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-ink-subtle">
            <Bot size={12} /> Bugun sarf
          </div>
          <div className="mt-1 text-[22px] font-semibold text-ink">{fmt(today?.cost_usd ?? 0, 4)}</div>
          <div className="mt-1 text-[11px] text-ink-subtle">{fmtInt(today?.calls ?? 0)} AI javob</div>
        </div>
        <div className="surface p-4">
          <div className="text-[11px] uppercase tracking-wider text-ink-subtle">Tokenlar (bu oy, in / out)</div>
          <div className="mt-1 text-[13px] font-mono text-ink">
            {fmtInt(month?.prompt_tokens ?? 0)} / {fmtInt(month?.completion_tokens ?? 0)}
          </div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-[15px] font-semibold text-ink">Modellar bo'yicha (bu oy)</h2>
        <div className="surface overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--divider)" }}>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Provayder</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Model</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Javoblar</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Token (in/out)</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Xarajat</th>
              </tr>
            </thead>
            <tbody>
              {byModel.map((r, i) => (
                <tr key={`${r.provider}-${r.model}-${i}`} style={{ borderBottom: "1px solid var(--divider)" }}>
                  <td className="px-4 py-2.5 capitalize">{r.provider || "—"}</td>
                  <td className="px-4 py-2.5 font-mono text-[12px]">{r.model || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmtInt(r.calls)}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-subtle">
                    {fmtInt(r.prompt_tokens)} / {fmtInt(r.completion_tokens)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmt(r.cost_usd, 6)}</td>
                </tr>
              ))}
              {byModel.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-subtle">Hozircha AI ishlatilmagan</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Users size={15} /> Lid narxlari (oxirgi AI javoblar)
        </h2>
        <div className="surface overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--divider)" }}>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Sana</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Lid</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Model</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Token (in/out)</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Narx</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Kalit</th>
              </tr>
            </thead>
            <tbody>
              {leadCosts.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--divider)" }}>
                  <td className="px-4 py-2.5 text-[12px] text-ink-subtle">
                    {r.created_at ? new Date(r.created_at).toLocaleString("uz") : ""}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.lead_name || `#${r.lead_id}`}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-[12px]">{r.model || r.provider || "—"}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-subtle">
                    {fmtInt(r.prompt_tokens)} / {fmtInt(r.completion_tokens)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono">{fmt(r.cost_usd, 6)}</td>
                  <td className="px-4 py-2.5 text-right text-[11px] text-ink-subtle">
                    {r.used_platform_key ? "Platforma" : "O'z kaliti"}
                  </td>
                </tr>
              ))}
              {leadCosts.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-ink-subtle">Hozircha lid xarajatlari yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-[15px] font-semibold text-ink">Balans tarixi</h2>
        <div className="surface overflow-hidden">
          <table className="w-full text-[13px]">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--divider)" }}>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Sana</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Tur</th>
                <th className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Izoh</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Miqdor</th>
                <th className="px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-wider text-ink-subtle">Balans</th>
              </tr>
            </thead>
            <tbody>
              {ledger.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--divider)" }}>
                  <td className="px-4 py-2.5 text-[12px] text-ink-subtle">
                    {r.created_at ? new Date(r.created_at).toLocaleString("uz") : ""}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px]"
                      style={{
                        backgroundColor: r.kind === "topup" ? "rgba(74,222,128,0.12)" : "var(--raised)",
                        color: r.kind === "topup" ? "var(--success)" : "var(--ink-muted)",
                      }}>
                      {r.kind === "topup" ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
                      {r.kind}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-ink-subtle">
                    {r.note}
                    {r.model && <span className="ml-2 rounded bg-raised px-1.5 py-0.5 text-[10px]">{r.model}</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono" style={{ color: r.amount_usd >= 0 ? "var(--success)" : "var(--ink)" }}>
                    {r.amount_usd >= 0 ? "+" : ""}{fmt(r.amount_usd, 6)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-ink-subtle">{fmt(r.balance_after, 4)}</td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-ink-subtle">Tarix bo'sh</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
