import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { channelsApi, ReqChannel } from "../../api/channels";
import { Modal } from "../../ui/Modal";
import { Input } from "../../ui/Input";
import { Toggle } from "../../ui/Toggle";
import { Button } from "../../ui/Button";

export function ChannelFormModal({ initial, onClose }: { initial: ReqChannel | null; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [username, setUsername] = useState(initial?.username || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [invite, setInvite] = useState(initial?.invite_url || "");
  const [active, setActive] = useState(initial?.is_active ?? true);

  const saveMut = useMutation({
    mutationFn: async () => {
      const body = { username, title, invite_url: invite, is_active: active, priority: initial?.priority ?? 100 };
      return isEdit ? channelsApi.update(initial!.id, body) : channelsApi.create(body);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["channels"] }); onClose(); },
    onError: (err: any) => alert("Xato: " + (err?.response?.data?.detail || err?.message)),
  });

  return (
    <Modal open={true} title={isEdit ? "Kanalni tahrirlash" : "Yangi majburiy kanal"} onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Bekor qilish</Button>
        <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending || !username.trim()}>
          {saveMut.isPending ? "Saqlanmoqda…" : "Saqlash"}
        </Button>
      </>}>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted mb-1 block">Kanal username *</label>
          <Input value={username} onChange={(e) => setUsername(e.target.value)}
            placeholder="@shoda_official yoki t.me/shoda_official" />
          <p className="mt-1 text-[11px] text-muted">Bot bu kanalda admin bo'lishi kerak (a'zolikni tekshirish uchun)</p>
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Ko'rinadigan nom</label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="Masalan: Shoda AI rasmiy kanal" />
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Taklif havolasi</label>
          <Input value={invite} onChange={(e) => setInvite(e.target.value)}
            placeholder="Bo'sh qoldirsangiz — https://t.me/username avtomatik" />
        </div>
        <Toggle checked={active} onChange={setActive} label="Faol" />
      </div>
    </Modal>
  );
}
