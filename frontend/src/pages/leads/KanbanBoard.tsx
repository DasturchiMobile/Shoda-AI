import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DragEvent, useState } from "react";
import { Phone, MessageSquare, User } from "lucide-react";
import { Board, Stage } from "../../api/boards";
import { Lead, leadsApi } from "../../api/leads";

const COLOR_MAP: Record<string, string> = {
  slate: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  cyan: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  amber: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  violet: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  green: "bg-green-500/20 text-green-300 border-green-500/30",
  red: "bg-red-500/20 text-red-300 border-red-500/30",
  blue: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  pink: "bg-pink-500/20 text-pink-300 border-pink-500/30",
  orange: "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

export function KanbanBoard({ board, leads, onOpenLead }: {
  board: Board; leads: Lead[]; onOpenLead: (l: Lead) => void;
}) {
  const qc = useQueryClient();
  const [dragOverStage, setDragOverStage] = useState<number | null>(null);

  const moveMut = useMutation({
    mutationFn: ({ id, stage_id }: { id: number; stage_id: number }) => leadsApi.move(id, stage_id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
  });

  const onDrop = (e: DragEvent, stage: Stage) => {
    e.preventDefault();
    setDragOverStage(null);
    const id = Number(e.dataTransfer.getData("lead-id"));
    if (id) moveMut.mutate({ id, stage_id: stage.id });
  };

  const leadsInStage = (sid: number) => leads.filter(l => l.stage_id === sid);
  const unassigned = leads.filter(l => !l.stage_id);

  return (
    <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: "60vh" }}>
      {board.stages.map((stage) => {
        const stageLeads = leadsInStage(stage.id);
        const chipCls = COLOR_MAP[stage.color] || COLOR_MAP.slate;
        const isOver = dragOverStage === stage.id;
        return (
          <div
            key={stage.id}
            onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage.id); }}
            onDragLeave={() => setDragOverStage(null)}
            onDrop={(e) => onDrop(e, stage)}
            className={`w-[280px] shrink-0 flex flex-col rounded-lg border ${isOver ? 'border-brand bg-brand/5' : 'border-border bg-surface2/40'}`}
          >
            <div className="p-3 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${chipCls}`}>
                  {stage.name}
                </span>
                <span className="text-[11px] text-muted">{stageLeads.length}</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {stageLeads.map((l) => (
                <LeadCard key={l.id} lead={l} onClick={() => onOpenLead(l)} />
              ))}
              {stageLeads.length === 0 && (
                <div className="text-center text-[11.5px] text-muted py-6">Bo'sh</div>
              )}
            </div>
          </div>
        );
      })}

      {unassigned.length > 0 && (
        <div className="w-[280px] shrink-0 flex flex-col rounded-lg border border-dashed border-border bg-surface2/20">
          <div className="p-3 border-b border-border text-[12px] text-muted">
            Tayinlanmagan · {unassigned.length}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {unassigned.map((l) => (
              <LeadCard key={l.id} lead={l} onClick={() => onOpenLead(l)} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function LeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const onDragStart = (e: DragEvent) => {
    e.dataTransfer.setData("lead-id", String(lead.id));
    e.dataTransfer.effectAllowed = "move";
  };
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="cursor-pointer rounded-md bg-surface border border-border p-2.5 hover:border-brand/40 hover:shadow-sm transition"
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="h-6 w-6 rounded-md bg-brand/15 text-brand grid place-items-center text-[10px] font-semibold">
          {(lead.name || lead.telegram_username || "?").slice(0, 2).toUpperCase()}
        </div>
        <div className="text-[13px] text-ink truncate flex-1">
          {lead.name || lead.telegram_username || `Lid #${lead.id}`}
        </div>
      </div>
      {lead.phone && (
        <div className="text-[11px] text-muted flex items-center gap-1 mb-0.5">
          <Phone size={9} /> {lead.phone}
        </div>
      )}
      {lead.telegram_username && (
        <div className="text-[11px] text-muted flex items-center gap-1 mb-0.5">
          <User size={9} /> @{lead.telegram_username.replace('@', '')}
        </div>
      )}
      {lead.last_message && (
        <div className="text-[11px] text-muted flex items-start gap-1 mt-1 pt-1 border-t border-border/50">
          <MessageSquare size={9} className="mt-0.5 shrink-0" />
          <span className="line-clamp-2">{lead.last_message}</span>
        </div>
      )}
      {lead.sale_value > 0 && (
        <div className="mt-1 text-[11px] font-medium text-green-400">
          {lead.sale_value.toLocaleString()} so'm
        </div>
      )}
    </div>
  );
}
