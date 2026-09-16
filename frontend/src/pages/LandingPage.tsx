import { ArrowRight, Bot, ShieldCheck, Sparkles, Workflow } from "lucide-react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const features = [
  {
    icon: Bot,
    title: "AI sales agent",
    text: "Mijozlarga tezkor javob beruvchi, bot orqali ishlaydigan avtomatlashtirilgan savdo yordami.",
  },
  {
    icon: Workflow,
    title: "Automations",
    text: "Katalog, triggerlar va kanal boshqaruvi bir joyda, harakatlar avtomatik ishlaydi.",
  },
  {
    icon: ShieldCheck,
    title: "Secure access",
    text: "Tashkilotlar, foydalanuvchilar va ma'lumotlar xavfsiz boshqaruv paneli bilan nazorat qilinadi.",
  },
];

export function LandingPage() {
  const { me } = useAuth();
  const navigate = useNavigate();

  if (me) {
    navigate(me.role === "superadmin" ? "/superadmin" : "/app", { replace: true });
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <header className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="wordmark text-accent-soft">Shoda</span>
            <span className="text-white">AI</span>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm text-slate-400 hover:text-white">
              Kirish
            </Link>
            <Link to="/login" className="btn btn-primary rounded-full px-5">
              Boshlash
            </Link>
          </div>
        </header>

        <main className="pt-16 pb-12 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent-soft">
                <Sparkles size={14} />
                AI-powered sales automation
              </div>

              <h1 className="max-w-xl text-4xl font-black tracking-tight text-white md:text-6xl">
                Soting va mijozlarga <span className="text-accent-soft">tez javob</span> bering.
              </h1>

              <p className="mt-6 max-w-xl text-lg text-slate-300">
                Shoda AI yordamida Telegram, katalog, triggerlar va bilim bazasi bir joyga birlashtiriladi.
                Mijozlarga avtomatik, individual va tezkor xizmat ko'rsating.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link to="/login" className="btn btn-primary rounded-full px-6 py-3 text-base">
                  Demo boshlash
                  <ArrowRight size={18} />
                </Link>
                <Link to="/register" className="btn rounded-full border border-white/15 bg-white/5 px-6 py-3 text-base text-white hover:bg-white/10">
                  Ro'yxatdan o'tish
                </Link>
              </div>

              <div className="mt-10 flex flex-wrap gap-8 text-sm text-slate-300">
                <div>
                  <div className="text-2xl font-bold text-white">24/7</div>
                  <div>Avtomatik javob</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">3x</div>
                  <div>Tezroq ishlash</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-white">1 panel</div>
                  <div>Har bir ma'lumot</div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-accent/20 via-surface to-surface2 p-5 shadow-2xl shadow-accent/10">
              <div className="rounded-2xl border border-white/10 bg-[#0f1117] p-5">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-slate-400">Operator dashboard</div>
                  <div className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] font-medium text-emerald-300">
                    Online
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-xl border border-white/10 bg-[#1a1a20] p-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Lead</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-white">Azizbek</div>
                        <div className="text-sm text-slate-400">Telegram orqali yangi buyurtma</div>
                      </div>
                      <div className="rounded-full bg-accent/15 px-2 py-1 text-xs text-accent-soft">Hot</div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-[#1a1a20] p-3">
                    <div className="text-xs uppercase tracking-[0.2em] text-slate-400">AI answer</div>
                    <div className="mt-2 rounded-lg bg-accent/10 p-3 text-sm text-slate-200">
                      “Mahsulot narxi 2 500 000 so'm. Bugun yetkazib berishimiz mumkin.”
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-white/10 bg-[#1a1a20] p-3">
                      <div className="text-slate-400">Orders</div>
                      <div className="mt-2 text-2xl font-bold text-white">184</div>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-[#1a1a20] p-3">
                      <div className="text-slate-400">Replies</div>
                      <div className="mt-2 text-2xl font-bold text-white">98%</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="mt-20">
            <div className="text-center">
              <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Why Shoda AI</div>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {features.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-[#131318] p-6">
                  <div className="mb-4 inline-flex rounded-xl bg-accent/10 p-3 text-accent-soft">
                    <Icon size={22} />
                  </div>
                  <h3 className="text-xl font-semibold text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{text}</p>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
