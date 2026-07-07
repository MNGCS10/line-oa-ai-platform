import { Navigate, Route, Routes } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { AppShell } from "@/components/AppShell";
import { LoginPage } from "@/pages/LoginPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { LiveChatPage } from "@/pages/LiveChatPage";
import { ContactsPage } from "@/pages/ContactsPage";
import { OrdersPage } from "@/pages/OrdersPage";
import { AppointmentsPage } from "@/pages/AppointmentsPage";
import { ProductsPage } from "@/pages/ProductsPage";
import { BroadcastPage } from "@/pages/BroadcastPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LiffBookingPage } from "@/pages/LiffBookingPage";

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = trpc.auth.me.useQuery();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-slate-400">กำลังโหลด...</div>;
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/liff/book" element={<LiffBookingPage />} />
      <Route path="/" element={<ProtectedLayout><DashboardPage /></ProtectedLayout>} />
      <Route path="/chat" element={<ProtectedLayout><LiveChatPage /></ProtectedLayout>} />
      <Route path="/contacts" element={<ProtectedLayout><ContactsPage /></ProtectedLayout>} />
      <Route path="/orders" element={<ProtectedLayout><OrdersPage /></ProtectedLayout>} />
      <Route path="/appointments" element={<ProtectedLayout><AppointmentsPage /></ProtectedLayout>} />
      <Route path="/products" element={<ProtectedLayout><ProductsPage /></ProtectedLayout>} />
      <Route path="/broadcast" element={<ProtectedLayout><BroadcastPage /></ProtectedLayout>} />
      <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
