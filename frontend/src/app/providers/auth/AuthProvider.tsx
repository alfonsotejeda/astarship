import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/lib/api/auth";
import { ApiError, setToken } from "@/lib/api/client";
import { AuthContext } from "./AuthContext";
import type { User } from "./roles";
import { clearSession, readSession, saveSession } from "./session";
import type { StoredSession } from "./session";

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restore the session before the first render so data requests carry its token
  const [initialSession] = useState<StoredSession | null>(() => {
    const session = readSession();
    if (session) setToken(session.token);
    return session;
  });
  const [user, setUser] = useState<User | null>(initialSession?.user ?? null);
  const sessionRef = useRef(initialSession);
  const queryClient = useQueryClient();

  // A stored token may have expired or the user may have been deleted
  useEffect(() => {
    const session = initialSession;
    // Demo sessions are local-only; there is no backend user to validate
    if (!session || session.token.startsWith("mock-")) return;

    let active = true;
    getCurrentUser()
      .then(currentUser => {
        if (active && sessionRef.current?.token === session.token) setUser(currentUser);
      })
      .catch(error => {
        if (!active || sessionRef.current?.token !== session.token) return;
        // Keep the session when the API is unreachable; only an expired token logs out
        if (!(error instanceof ApiError) || error.status !== 401) return;
        sessionRef.current = null;
        setToken(null);
        setUser(null);
        clearSession();
        queryClient.clear();
      });

    return () => {
      active = false;
    };
  }, [initialSession, queryClient]);

  function login(user: User, token: string, remember = true) {
    setToken(token);
    setUser(user);
    sessionRef.current = { token, user };
    saveSession({ token, user }, remember);
  }

  // Cached data belongs to the previous user
  function logout() {
    setToken(null);
    setUser(null);
    sessionRef.current = null;
    clearSession();
    queryClient.clear();
  }

  return (
    <AuthContext value={{ user, login, logout }}>
      {children}
    </AuthContext>
  );
}
