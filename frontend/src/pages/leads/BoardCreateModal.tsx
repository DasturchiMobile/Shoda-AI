import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { boardsApi, Board } from "../../api/boards";
import { Modal } from "../../ui/Modal";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";
import { ShoppingBag, HeadphonesIcon, UserPlus, Wrench, Zap, Sparkles } from "lucide-react";

type Template = {
  id: string;
  name: string;
  desc: string;
  icon: any;
  stages: { name: string; color: string; is_won?: boolean; is_lost?: boolean }[];
};

const TEMPLATES: Template[] = [
  {
    id: "sales", name: "Sotuv voronkasi", desc: "Klassik sotuv jarayoni",
    icon: ShoppingBag,
    stages: [
      { name: "Yangi lid", color: "slate" },
      { name: "Bog'landi", color: "cyan" },
      { name: "Taklif yuborildi", color: "amber" },
      { name: "Muzokara", color: "violet" },
      { name: "Yutildi", color: "green", is_won: true },
      { name: "Yo'qotildi", color: "red", is_lost: true },
    ],
  },
  {
    id: "support", name: "Mijozlarga xizmat", desc: "Ariza va shikoyatlar",
    icon: HeadphonesIcon,
    stages: [
      { name: "Yangi ariza", color: "slate" },
      { name: "Ko'rib chiqilyapti", color: "amber" },
      { name: "Yechim taklif qilindi", color: "violet" },
      { name: "Yopildi", color: "green", is_won: true },
    ],
  },
  {
    id: "hr", name: "Xodim yollash", desc: "Nomzodlar bo'yicha",
    icon: UserPlus,
    stages: [
      { name: "Ariza", color: "slate" },
      { name: "Suhbat", color: "cyan" },
      { name: "Test topshiriq", color: "amber" },
      { name: "Yakuniy intervyu", color: "violet" },
      { name: "Ishga qabul", color: "green", is_won: true },
      { name: "Rad etildi", color: "red", is_lost: true },
    ],
  },
  {
    id: "service", name: "Xizmat buyurtmalari", desc: "Ustaxona/servis uchun",
    icon: Wrench,
    stages: [
      { name: "Buyurtma", color: "slate" },
      { name: "Diagnostika", color: "cyan" },
      { name: "Ta'mirlash", color: "amber" },
      { name: "Sinov", color: "violet" },
      { name: "Yakunlandi", color: "green", is_won: true },
      { name: "Bekor qilindi", color: "red", is_lost: true },
    ],
  },
  {
    id: "marketing", name: "Marketing kampaniya", desc: "Reklama voronkasi",
    icon: Zap,
    stages: [
      { name: "Ko'rish", color: "slate" },
      { name: "Bosgan", color: "cyan" },
      { name: "Ro'yxatdan o'tgan", color: "amber" },
      { name: "Sotib olgan", color: "green", is_won: true },
    ],
  },
  {
    id: "blank", name: "Bo'sh board", desc: "Bosqichlarni o'zingiz qo'shasiz",
    icon: Sparkles,
    stages: [
      { name: "Yangi", color: "slate" },
    ],
  },
];

export function BoardCreateModal({ onClose, onCreated }: {
  onClose: () => void; onCreated: (b: Board) => void;
}) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [tplId, setTplId] = useState<string>("sales");

  const mut = useMutation({
    mutationFn: async () => {
      const tpl = TEMPLATES.find(t => t.id === tplId)!;
      const boardName = name.trim() || tpl.name;
      const b = await boardsApi.create(boardName);
      // The API creates default stages ("Yangi", "Jarayonda", "Yutildi", "Yo'qotildi").
      // Delete them and add the template's stages.
      for (const s of b.stages) {
        await boardsApi.deleteStage(s.id);
      }
      for (let i = 0; i < tpl.stages.length; i++) {
        const st = tpl.stages[i];
        await boardsApi.createStage(b.id, {
          name: st.name, color: st.color, position: (i + 1) * 100,
          is_won: !!st.is_won, is_lost: !!st.is_lost,
        });
      }
      const boards = await boardsApi.list();
      return boards.find(x => x.id === b.id)!;
    },
    onSuccess: (b) => {
      qc.invalidateQueries({ queryKey: ["boards"] });
      onCreated(b);
    },
    onError: (err: any) => alert("Xato: " + (err?.response?.data?.detail || err?.message)),
  });

  return (
    <Modal open={true} title="Yangi board" onClose={onClose} size="lg"
      footer={<>
        <Button variant="ghost" onClick={onClose}>Bekor</Button>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
          {mut.isPending ? "Yaratilyapti…" : "Yaratish"}
        </Button>
      </>}>
      <div className="space-y-5">
        <div>
          <label className="text-xs text-muted mb-1 block">Board nomi (ixtiyoriy)</label>
          <Input value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Bo'sh qoldirsangiz — shablon nomi ishlatiladi" />
        </div>

        <div>
          <label className="text-xs text-muted mb-2 block">Shablonni tanlang</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {TEMPLATES.map((t) => {
              const on = tplId === t.id;
              return (
                <button key={t.id} onClick={() => setTplId(t.id)}
                  className={`text-left p-3 rounded-lg border transition ${
                    on ? "border-brand bg-brand/10" : "border-border bg-surface2 hover:border-border-strong"
                  }`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`h-8 w-8 rounded-md grid place-items-center shrink-0 ${on ? 'bg-brand text-white' : 'bg-surface text-muted'}`}>
                      <t.icon size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium text-ink">{t.name}</div>
                      <div className="text-[11px] text-muted mt-0.5">{t.desc}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {t.stages.slice(0, 5).map((s, i) => (
                          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-surface border border-border text-muted">
                            {s.name}
                          </span>
                        ))}
                        {t.stages.length > 5 && <span className="text-[10px] text-muted">+{t.stages.length - 5}</span>}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
