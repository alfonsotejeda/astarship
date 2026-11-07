import { Navigate, Outlet } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import type { Role } from "@/app/providers/auth/roles";

// RNF-10: a route outside the user's role sends them to their own home
export function RequireRole({ roles }: { roles: Role[] }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <Outlet />;
}
