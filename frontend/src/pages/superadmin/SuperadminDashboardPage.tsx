import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Building2, Inbox, Package, Users, Wallet, TrendingUp, DollarSign, CheckCircle2 } from "lucide-react";
import { Topbar } from "../../layouts/Topbar";
import { superadminApi } from "../../api/superadmin";
import { billingApi } from "../../api/billing";

function fmt(n: number, dp = 2) { return `$${(n || 0).toFixed(dp)}`; }
function fmtInt(n: number) { return new Intl.NumberFormat().format(n || 0); }

function Stat({ icon, label, value, sub, to, tone = "default" }: {
  icon: JSX.Element; label: string; value: any; sub?: string; to?: string;
  tone?: "default" | "success" | "danger" | "brand";
}) {
  const toneColor = tone === "success" ? "var(--success)" : tone === "danger" ? "var(--danger)" : tone === "brand" ? "var(--brand)" : "var(--ink)";
  const bg = tone === "brand" ? "var(--brand-soft)" : "var(--raised)";
  const inner = (
    <div className="surface p-4 h-full transition hover:border-[var(--brand)]">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md" style={{ backgroundColor: bg, color: toneColor }}>{icon}</div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-ink-subtle">{label}</div>
          <div className="mt-0.5 text-[22px] font-semibold text-ink truncate">{value}</div>
          {sub && <div className="text-[11px] text-ink-subtle">{sub}</div>}
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export function SuperadminDashboardPage() {
  const { data: s } = useQuery({ queryKey: ["su-stats"], queryFn: superadminApi.stats });
  const { data: billing = [] } = useQuery({ queryKey: ["sa-billing"], queryFn: billingApi.saList });

  const totalBalance = billing.reduce((sum, r) => sum + r.balance_usd, 0);
  const totalSpent = billing.reduce((sum, r) => sum + r.total_spent_usd, 0);
  const monthlyRevenue = billing.reduce((sum, r) => sum + (r.subscription_active ? r.monthly_fee_usd : 0), 0);
  const activeSubs = billing.filter(r => r.subscription_active).length;
  const totalTokens = billing.reduce((sum, r) => sum + r.total_input_tokens + r.total_output_tokens, 0);

  return (
    <>
      <Topbar title="Superadmin" subtitle="Platform overview" />
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-ink">Platforma boshqaruv paneli</h1>
          <p className="text-muted text-sm mt-1">Barcha tashkilotlar bo'yicha umumiy statistika.</p>
        </div>

        {/* Moliya */}
        <div>
          <h2 className="mb-3 text-[13px] uppercase tracking-wider text-ink-subtle">Moliya</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Wallet size={16} />} label="Jami balans"
              value={fmt(totalBalance, 2)} sub="Tashkilotlar hisoblarida"
              tone="brand" to="/superadmin/billing" />
            <Stat icon={<TrendingUp size={16} />} label="Jami sarflandi"
              value={fmt(totalSpent, 4)} sub="Gemini tokenlari" to="/superadmin/billing" />
            <Stat icon={<DollarSign size={16} />} label="Oylik daromad"
              value={fmt(monthlyRevenue, 2)} sub={`${activeSubs} faol obuna`}
              tone="success" to="/superadmin/billing" />
            <Stat icon={<Package size={16} />} label="Jami tokenlar"
              value={fmtInt(totalTokens)} sub="Barcha org" to="/superadmin/billing" />
          </div>
        </div>

        {/* Tizim */}
        <div>
          <h2 className="mb-3 text-[13px] uppercase tracking-wider text-ink-subtle">Tizim</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat icon={<Building2 size={16} />} label="Tashkilotlar" value={s?.orgs_total ?? "—"} to="/superadmin/tenants" />
            <Stat icon={<Inbox size={16} />} label="Kutilayotgan arizalar"
              value={s?.orgs_pending ?? "—"} to="/superadmin/registrations"
              tone={s?.orgs_pending ? "brand" : "default"} />
            <Stat icon={<Users size={16} />} label="Foydalanuvchilar" value={s?.users_total ?? "—"} />
            <Stat icon={<CheckCircle2 size={16} />} label="Faol obunalar"
              value={activeSubs} sub={`${billing.length - activeSubs} to'xtatilgan`} tone="success" />
          </div>
        </div>
      </div>
    </>
  );
}
