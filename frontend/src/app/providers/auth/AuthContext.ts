import { createContext, use } from "react";
import type { User } from "./roles";

export interface AuthContextValue {
  user: User | null;
  login: (user: User) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
