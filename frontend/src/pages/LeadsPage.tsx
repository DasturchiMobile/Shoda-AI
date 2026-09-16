import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Settings2, ChevronDown, Search } from "lucide-react";
import { boardsApi, Board } from "../api/boards";
import { leadsApi, Lead } from "../api/leads";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { KanbanBoard } from "./leads/KanbanBoard";
import { LeadDetailPanel } from "./leads/LeadDetailPanel";
import { BoardSettingsModal } from "./leads/BoardSettingsModal";
import { BoardCreateModal } from "./leads/BoardCreateModal";
import { LeadFormModal } from "./leads/LeadFormModal";

export function LeadsPage() {
  const qc = useQueryClient();
  const { data: boards = [] } = useQuery({ queryKey: ["boards"], queryFn: boardsApi.list });
  const [boardId, setBoardId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Lead | null>(null);
  const [creating, setCreating] = useState(false);
  const [settingsBoard, setSettingsBoard] = useState<Board | null>(null);
  const [addingBoard, setAddingBoard] = useState(false);

  useEffect(() => {
    if (!boardId && boards.length > 0) {
      const def = boards.find(b => b.is_default) || boards[0];
      setBoardId(def.id);
    }
  }, [boards, boardId]);

  const board = boards.find(b => b.id === boardId) || null;

  const { data: leads = [] } = useQuery({
    queryKey: ["leads", boardId, search],
    queryFn: () => leadsApi.list({ board_id: boardId!, search: search || undefined }),
    enabled: !!boardId,
  });



  return (
    <div className="w-full space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-ink">Lidlar</h1>
          <p className="mt-0.5 text-[13px] text-muted">Sotuv jarayonini kuzatib boring</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Ism, telefon, username..." className="pl-9 w-64" />
          </div>
          <Button onClick={() => setCreating(true)}><Plus size={14} /> Yangi lid</Button>
        </div>
      </div>

      {/* Board tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {boards.map((b) => (
          <div key={b.id} onClick={() => setBoardId(b.id)} role="button" tabIndex={0}
            className={`cursor-pointer select-none px-3.5 py-2 text-[13px] border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              boardId === b.id ? "border-brand text-ink font-medium" : "border-transparent text-muted hover:text-ink"
            }`}>
            {b.name}
            {boardId === b.id && (
              <span onClick={(e) => { e.stopPropagation(); setSettingsBoard(b); }}
                className="text-muted hover:text-ink ml-1 cursor-pointer">
                <Settings2 size={12} />
              </span>
            )}
          </div>
        ))}
        <button onClick={() => setAddingBoard(true)}
          className="px-3 py-2 text-[13px] text-muted hover:text-ink flex items-center gap-1">
          <Plus size={12} /> Board
        </button>
      </div>

      {board && (
        <KanbanBoard
          board={board}
          leads={leads}
          onOpenLead={setDetail}
        />
      )}

      {detail && <LeadDetailPanel lead={detail} board={board} onClose={() => setDetail(null)} />}
      {creating && board && <LeadFormModal board={board} onClose={() => setCreating(false)} />}
      {settingsBoard && <BoardSettingsModal board={settingsBoard} onClose={() => setSettingsBoard(null)} />}
      {addingBoard && <BoardCreateModal onClose={() => setAddingBoard(false)} onCreated={(b) => { setBoardId(b.id); setAddingBoard(false); }} />}
    </div>
  );
}
