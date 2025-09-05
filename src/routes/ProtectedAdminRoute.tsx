import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useIsAdmin } from "@/hooks/useIsAdmin";

export default function ProtectedAdminRoute({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useIsAdmin();

  if (loading) return <div className="p-6 text-sm opacity-75">Checking admin…</div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
}