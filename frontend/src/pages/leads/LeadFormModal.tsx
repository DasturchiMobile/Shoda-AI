import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Board } from "../../api/boards";
import { leadsApi } from "../../api/leads";
import { Modal } from "../../ui/Modal";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";

export function LeadFormModal({ board, onClose }: { board: Board; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tgUser, setTgUser] = useState("");
  const [stageId, setStageId] = useState(board.stages[0]?.id || 0);

  const mut = useMutation({
    mutationFn: () => leadsApi.create({
      name, phone, telegram_username: tgUser,
      board_id: board.id, stage_id: stageId as any,
      source: "manual",
    } as any),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); onClose(); },
    onError: (err: any) => alert("Xato: " + (err?.response?.data?.detail || err?.message)),
  });

  return (
    <Modal open={true} title="Yangi lid" onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Bekor</Button>
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || (!name.trim() && !phone.trim() && !tgUser.trim())}>
          {mut.isPending ? "Saqlanmoqda…" : "Saqlash"}
        </Button>
      </>}>
      <div className="space-y-3">
        <div>
          <label className="text-xs text-muted mb-1 block">Ism</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mijoz ismi" />
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Telefon</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998..." />
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Telegram username</label>
          <Input value={tgUser} onChange={(e) => setTgUser(e.target.value)} placeholder="@username" />
        </div>
        <div>
          <label className="text-xs text-muted mb-1 block">Bosqich</label>
          <select value={stageId} onChange={(e) => setStageId(Number(e.target.value))}
            className="w-full rounded-md border border-border bg-surface2 text-ink px-3 py-2 text-[13px]">
            {board.stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
    </Modal>
  );
}
