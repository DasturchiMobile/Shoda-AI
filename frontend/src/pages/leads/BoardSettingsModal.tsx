import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, Plus } from "lucide-react";
import { boardsApi, Board } from "../../api/boards";
import { Modal } from "../../ui/Modal";
import { Input } from "../../ui/Input";
import { Button } from "../../ui/Button";

const COLORS = ["slate", "cyan", "amber", "violet", "green", "red", "blue", "pink", "orange"];

export function BoardSettingsModal({ board, onClose }: { board: Board; onClose: () => void }) {
  const qc = useQueryClient();
  const [name, setName] = useState(board.name);
  const [stages, setStages] = useState(board.stages);
  const [newName, setNewName] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["boards"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  const renameMut = useMutation({
    mutationFn: () => boardsApi.update(board.id, name, board.is_default),
    onSuccess: invalidate,
  });
  const deleteMut = useMutation({ mutationFn: () => boardsApi.remove(board.id), onSuccess: () => { invalidate(); onClose(); } });
  const updStage = useMutation({
    mutationFn: (s: any) => boardsApi.updateStage(s.id, { name: s.name, color: s.color, position: s.position, is_won: s.is_won, is_lost: s.is_lost }),
    onSuccess: invalidate,
  });
  const addStage = useMutation({
    mutationFn: () => boardsApi.createStage(board.id, {
      name: newName.trim() || "Yangi bosqich", color: "slate", position: (stages.length + 1) * 100, is_won: false, is_lost: false,
    }),
    onSuccess: (s) => { setStages([...stages, s]); setNewName(""); invalidate(); },
  });
  const delStage = useMutation({
    mutationFn: (sid: number) => boardsApi.deleteStage(sid),
    onSuccess: (_, sid) => { setStages(stages.filter(s => s.id !== sid)); invalidate(); },
  });

  return (
    <Modal open={true} title="Board sozlamalari" onClose={onClose} size="lg"
      footer={<>
        <button onClick={() => { if (confirm(`"${board.name}" board'ini o'chirasizmi?`)) deleteMut.mutate(); }}
          className="btn-ghost text-red-400 mr-auto flex items-center gap-1.5"><Trash2 size={13} /> Board'ni o'chirish</button>
        <Button variant="ghost" onClick={onClose}>Yopish</Button>
      </>}>
      <div className="space-y-5">
        <div>
          <label className="text-xs text-muted mb-1 block">Board nomi</label>
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Button onClick={() => renameMut.mutate()} disabled={renameMut.isPending || name === board.name}>
              Saqlash
            </Button>
          </div>
        </div>

        <div>
          <label className="text-xs text-muted mb-2 block">Bosqichlar</label>
          <div className="space-y-2">
            {stages.sort((a, b) => a.position - b.position).map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-2 rounded-md border border-border bg-surface2">
                <select value={s.color} onChange={(e) => {
                  const next = { ...s, color: e.target.value };
                  setStages(stages.map(x => x.id === s.id ? next : x));
                  updStage.mutate(next);
                }} className="rounded bg-surface text-ink text-xs px-2 py-1 border border-border">
                  {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <Input value={s.name} onChange={(e) => {
                  const next = { ...s, name: e.target.value };
                  setStages(stages.map(x => x.id === s.id ? next : x));
                }} onBlur={() => updStage.mutate(s)} className="flex-1" />
                <label className="text-[11px] text-muted flex items-center gap-1">
                  <input type="checkbox" checked={s.is_won} onChange={(e) => {
                    const next = { ...s, is_won: e.target.checked, is_lost: false };
                    setStages(stages.map(x => x.id === s.id ? next : x));
                    updStage.mutate(next);
                  }} /> Yutildi
                </label>
                <label className="text-[11px] text-muted flex items-center gap-1">
                  <input type="checkbox" checked={s.is_lost} onChange={(e) => {
                    const next = { ...s, is_lost: e.target.checked, is_won: false };
                    setStages(stages.map(x => x.id === s.id ? next : x));
                    updStage.mutate(next);
                  }} /> Yo'qotildi
                </label>
                <button onClick={() => { if (confirm(`"${s.name}" bosqichini o'chirasizmi?`)) delStage.mutate(s.id); }}
                  className="btn-ghost !p-1.5 hover:text-red-400"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-3">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addStage.mutate()}
              placeholder="Yangi bosqich nomi" className="flex-1" />
            <Button onClick={() => addStage.mutate()} disabled={addStage.isPending}>
              <Plus size={13} /> Qo'shish
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
