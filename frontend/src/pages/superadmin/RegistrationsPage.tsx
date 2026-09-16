import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, X } from "lucide-react";
import { Topbar } from "../../layouts/Topbar";
import { Button, EmptyState, Table, TD, TH, THead, TR } from "../../ui";
import { superadminApi } from "../../api/superadmin";
import { pushToast } from "../../hooks/useToast";

export function RegistrationsPage() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ["su-regs"],
    queryFn: () => superadminApi.registrations("pending"),
  });

  const act = useMutation({
    mutationFn: (id: number) => superadminApi.activate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["su-regs"] });
      qc.invalidateQueries({ queryKey: ["su-stats"] });
      pushToast("Faollashtirildi", "success");
    },
  });
  const rej = useMutation({
    mutationFn: (id: number) => superadminApi.reject(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["su-regs"] });
      pushToast("Rad etildi", "info");
    },
  });

  return (
    <>
      <Topbar title="Arizalar" subtitle="Kutilayotgan tashkilotlar" />
      <div className="p-6">
        <h1 className="text-2xl font-medium mb-4">Ro'yxatdan o'tish arizalari</h1>

        {!isLoading && data.length === 0 && (
          <EmptyState title="Kutilayotgan ariza yo'q" description="Barcha arizalar ko'rib chiqilgan." />
        )}

        {data.length > 0 && (
          <Table>
            <THead>
              <tr>
                <TH>Tashkilot</TH>
                <TH>Admin</TH>
                <TH>Aloqa</TH>
                <TH>Username</TH>
                <TH>Sana</TH>
                <TH className="text-right">Amallar</TH>
              </tr>
            </THead>
            <tbody>
              {data.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.org_name}</TD>
                  <TD>{r.admin_name}</TD>
                  <TD className="text-muted text-xs">
                    {r.contact_phone && <div>{r.contact_phone}</div>}
                    {r.contact_telegram && <div>{r.contact_telegram}</div>}
                  </TD>
                  <TD className="font-mono text-xs">{r.username}</TD>
                  <TD className="text-muted text-xs">
                    {r.requested_at ? new Date(r.requested_at).toLocaleString("uz-UZ") : "—"}
                  </TD>
                  <TD>
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => rej.mutate(r.id)} disabled={rej.isPending}>
                        <X size={14} /> Rad etish
                      </Button>
                      <Button onClick={() => act.mutate(r.id)} disabled={act.isPending}>
                        <Check size={14} /> Faollashtirish
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
