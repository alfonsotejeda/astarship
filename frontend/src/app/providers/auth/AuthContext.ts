import { createContext, use } from "react";
import type { User } from "./roles";

export interface AuthContextValue {
  user: User | null;
  // remember stores the session across browser restarts; without it, only this tab
  login: (user: User, token: string, remember?: boolean) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

// For the pages behind RequireRole, where there is always a user
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error("useCurrentUser must be used behind RequireRole");
  return user;
}
