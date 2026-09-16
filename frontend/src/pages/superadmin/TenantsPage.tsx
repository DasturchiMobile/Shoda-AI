import { useQuery } from "@tanstack/react-query";
import { Topbar } from "../../layouts/Topbar";
import { Badge, Table, TD, TH, THead, TR } from "../../ui";
import { superadminApi } from "../../api/superadmin";

export function TenantsPage() {
  const { data = [] } = useQuery({ queryKey: ["su-tenants"], queryFn: superadminApi.tenants });
  return (
    <>
      <Topbar title="Tashkilotlar" />
      <div className="p-6">
        <h1 className="text-2xl font-medium mb-4">Tashkilotlar</h1>
        <Table>
          <THead>
            <tr>
              <TH>Nomi</TH>
              <TH>Slug</TH>
              <TH>Status</TH>
              <TH>Users</TH>
              <TH>Products</TH>
              <TH>Yaratilgan</TH>
            </tr>
          </THead>
          <tbody>
            {data.map((t) => (
              <TR key={t.id}>
                <TD className="font-medium">{t.name}</TD>
                <TD className="font-mono text-xs text-muted">{t.slug}</TD>
                <TD>
                  <Badge tone={t.status === "active" ? "success" : t.status === "suspended" ? "danger" : "warning"}>
                    {t.status}
                  </Badge>
                </TD>
                <TD>{t.user_count}</TD>
                <TD>{t.product_count}</TD>
                <TD className="text-muted text-xs">
                  {t.created_at ? new Date(t.created_at).toLocaleString("uz-UZ") : "—"}
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
