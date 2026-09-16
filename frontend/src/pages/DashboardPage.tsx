import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, Bot, ChevronRight, CircleCheck, CircleDollarSign, Layers3, Package, Sparkles, Target, Users } from "lucide-react";
import { Topbar } from "../layouts/Topbar";
import { productsApi } from "../api/products";
import { categoriesApi } from "../api/categories";
import { billingApi } from "../api/billing";
import { api } from "../api/client";
import { useAuth } from "../hooks/useAuth";

function money(n: number, digits = 2) { return `$${(n || 0).toFixed(digits)}`; }

function Metric({ icon, label, value, hint, to }: { icon: React.ReactNode; label: string; value: React.ReactNode; hint: string; to: string }) {
  return <Link to={to} className="group rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-[0_14px_34px_rgba(23,32,51,.08)]">
    <div className="flex items-start justify-between"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#eef2ff] text-accent">{icon}</div><ArrowUpRight size={16} className="text-slate-300 transition group-hover:text-accent" /></div>
    <div className="mt-5 text-[12px] font-semibold text-muted">{label}</div><div className="mt-1 text-[27px] font-extrabold tracking-[-.04em] text-ink">{value}</div><div className="mt-1 text-[11px] text-muted">{hint}</div>
  </Link>;
}

export function DashboardPage() {
  const { me } = useAuth();
  const products = useQuery({ queryKey: ["products", "count"], queryFn: () => productsApi.list({ per_page: 1 }) });
  const cats = useQuery({ queryKey: ["categories"], queryFn: categoriesApi.list });
  const leadStats = useQuery({ queryKey: ["lead-stats"], queryFn: () => api.get("/leads/stats").then(r => r.data) });
  const billing = useQuery({ queryKey: ["my-billing"], queryFn: billingApi.my });
  const stats = leadStats.data || {};
  const total = Object.values(stats).reduce((sum: number, count: any) => sum + (count || 0), 0);
  const won = stats.won || 0;
  const active = (stats.contacted || 0) + (stats.qualified || 0) + (stats.negotiating || 0);
  const conversion = total ? Math.round((won / total) * 100) : 0;
  const funnel = [
    { label: "Yangi murojaatlar", value: stats.new || 0, color: "bg-accent" },
    { label: "Jarayonda", value: active, color: "bg-[#f59e0b]" },
    { label: "Muvaffaqiyatli", value: won, color: "bg-[#12a36d]" },
  ];

  return <><Topbar title="Boshqaruv paneli" subtitle={me?.org_name} />
    <div className="mx-auto max-w-[1440px] p-4 sm:p-6 lg:p-8 xl:p-10">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div><div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.15em] text-accent"><Sparkles size={14}/> Bugungi umumiy holat</div><h1 className="text-3xl font-extrabold tracking-[-.045em] text-ink sm:text-4xl">Salom, {me?.username || "foydalanuvchi"}</h1><p className="mt-2 text-sm text-muted">Savdo, mijozlar va AI yordamchingiz — hammasi bir joyda.</p></div>
        <Link to="/app/leads" className="btn-primary !rounded-xl !px-4 !py-2.5">Lidlarni ko‘rish <ChevronRight size={16}/></Link>
      </header>
      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Users size={19}/>} label="Jami lidlar" value={total} hint={`${stats.new || 0} ta yangi murojaat`} to="/app/leads" />
        <Metric icon={<Target size={19}/>} label="Konversiya" value={`${conversion}%`} hint={`${won} ta muvaffaqiyatli savdo`} to="/app/leads" />
        <Metric icon={<Package size={19}/>} label="Mahsulotlar" value={products.data?.total ?? "—"} hint={`${cats.data?.length ?? 0} ta kategoriya ichida`} to="/app/products" />
        <Metric icon={<CircleDollarSign size={19}/>} label="Mavjud balans" value={money(billing.data?.balance_usd ?? 0)} hint={billing.data?.subscription_active ? "Obuna faol" : "Obuna faol emas"} to="/app/billing" />
      </section>
      <section className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.85fr]">
        <div className="rounded-3xl border border-border bg-white p-5 sm:p-7">
          <div className="flex items-start justify-between"><div><h2 className="text-base font-extrabold">Savdo jarayoni</h2><p className="mt-1 text-xs text-muted">Lidlar qaysi bosqichda ekanini kuzating</p></div><span className="rounded-full bg-[#ecfdf5] px-3 py-1 text-[11px] font-bold text-[#087a51]">{active} ta faol</span></div>
          <div className="mt-8 space-y-6">{funnel.map(item => { const width = total ? Math.max(6, Math.round(item.value / total * 100)) : 0; return <div key={item.label}><div className="mb-2 flex items-center justify-between text-xs"><span className="font-semibold">{item.label}</span><span className="font-extrabold">{item.value}</span></div><div className="h-2.5 overflow-hidden rounded-full bg-surface2"><div className={`h-full rounded-full ${item.color} transition-all duration-700`} style={{width: `${width}%`}}/></div></div>; })}</div>
          <Link to="/app/leads" className="mt-8 flex items-center justify-between rounded-2xl bg-surface2 px-4 py-3 text-xs font-bold transition hover:bg-[#e9eef8]">Kanban orqali boshqarish <ChevronRight size={16} className="text-accent"/></Link>
        </div>
        <div className="relative overflow-hidden rounded-3xl bg-[#172033] p-6 text-white sm:p-7"><div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent/30 blur-2xl"/><div className="relative"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-[#9fb2ff]"><Bot size={23}/></div><h2 className="mt-6 text-xl font-extrabold tracking-tight">AI yordamchini kuchaytiring</h2><p className="mt-2 text-xs leading-6 text-slate-300">Mahsulot va xizmatlaringiz haqidagi ma’lumotlarni qo‘shing — AI mijozlarga aniqroq javob beradi.</p><div className="mt-6 space-y-3 text-xs"><div className="flex items-center gap-2"><CircleCheck size={15} className="text-[#5ee1ad]"/> Mahsulotlar katalogi</div><div className="flex items-center gap-2"><CircleCheck size={15} className="text-[#5ee1ad]"/> Kategoriyalar tizimi</div><div className="flex items-center gap-2"><Layers3 size={15} className="text-[#9fb2ff]"/> Bilim bazasini kengaytirish</div></div><Link to="/app/knowledge" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-ink transition hover:bg-[#eef2ff]">Bilim qo‘shish <ArrowUpRight size={15}/></Link></div></div>
      </section>
      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <QuickLink to="/app/products" icon={<Package size={18}/>} title="Mahsulot qo‘shish" text="Katalogni yangilang" tone="orange" />
        <QuickLink to="/app/integrations" icon={<Bot size={18}/>} title="Kanal ulash" text="Telegram yoki Instagram" tone="green" />
        <QuickLink to="/app/billing" icon={<CircleDollarSign size={18}/>} title="Balansni boshqarish" text="Sarflar va obuna" tone="blue" />
      </section>
    </div>
  </>;
}

function QuickLink({to, icon, title, text, tone}: {to:string; icon:React.ReactNode; title:string; text:string; tone:"orange"|"green"|"blue"}) {
  const colors = tone === "orange" ? "bg-[#fff7ed] text-[#c25d09]" : tone === "green" ? "bg-[#ecfdf5] text-[#087a51]" : "bg-[#eef2ff] text-accent";
  return <Link to={to} className="group flex items-center gap-4 rounded-2xl border border-border bg-white p-4 transition hover:border-accent/30"><div className={`grid h-10 w-10 place-items-center rounded-xl ${colors}`}>{icon}</div><div className="flex-1"><div className="text-xs font-bold">{title}</div><div className="mt-0.5 text-[11px] text-muted">{text}</div></div><ChevronRight size={16} className="text-slate-300 group-hover:text-accent"/></Link>;
}
