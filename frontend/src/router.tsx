import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import { AdminLayout } from "./layouts/AdminLayout";
import { SuperadminLayout } from "./layouts/SuperadminLayout";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { ProductsPage } from "./pages/products/ProductsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { TriggersPage } from "./pages/TriggersPage";
import { ChannelsPage } from "./pages/ChannelsPage";
import { KnowledgePage } from "./pages/KnowledgePage";
import { LeadsPage } from "./pages/LeadsPage";
import { IntegrationsPage } from "./pages/IntegrationsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { TeamPage } from "./pages/TeamPage";
import { BillingPage } from "./pages/BillingPage";
import { SuperadminBillingPage } from "./pages/superadmin/SuperadminBillingPage";
import { SuperadminIntegrationsPage } from "./pages/superadmin/SuperadminIntegrationsPage";
import { SuperadminDashboardPage } from "./pages/superadmin/SuperadminDashboardPage";
import { RegistrationsPage } from "./pages/superadmin/RegistrationsPage";
import { TenantsPage } from "./pages/superadmin/TenantsPage";
import { LandingPage } from "./pages/LandingPage";

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-muted">
      Yuklanmoqda…
    </div>
  );
}

function RequireAuth({ children, super_ = false }: { children: JSX.Element; super_?: boolean }) {
  const { me, loading } = useAuth();
  if (loading) return <Loader />;
  if (!me) return <Navigate to="/login" replace />;
  if (super_ && me.role !== "superadmin") return <Navigate to="/app" replace />;
  return children;
}

export function Router() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/app"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="products" element={<ProductsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="triggers" element={<TriggersPage />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="leads" element={<LeadsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="billing" element={<BillingPage />} />
      </Route>

      <Route
        path="/superadmin"
        element={
          <RequireAuth super_>
            <SuperadminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<SuperadminDashboardPage />} />
        <Route path="registrations" element={<RegistrationsPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="billing" element={<SuperadminBillingPage />} />
        <Route path="integrations" element={<SuperadminIntegrationsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
