import { useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setToken } from "@/lib/api/client";
import { AuthContext } from "./AuthContext";
import type { User } from "./roles";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  function login(user: User, token: string) {
    setToken(token);
    setUser(user);
  }

  // Cached data belongs to the previous user
  function logout() {
    setToken(null);
    setUser(null);
    queryClient.clear();
  }

  return (
    <AuthContext value={{ user, login, logout }}>
      {children}
    </AuthContext>
  );
}
