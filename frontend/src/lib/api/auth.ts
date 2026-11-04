import type { Role, User } from "@/app/providers/auth/roles";
import { requestBackend, setToken } from "./client";

// Roles as the API names them. The UI calls operations_manager "manager".
export type BackendRole = "admin" | "guide" | "operations_manager" | "tourist";

export interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: BackendRole;
  guide: { specialty: string } | null;
  tourist: { age: number } | null;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterBase {
  name: string;
  email: string;
  password: string;
}

export type RegisterRequest =
  | (RegisterBase & { role: "admin" | "operations_manager" })
  | (RegisterBase & { role: "guide"; specialty: string })
  | (RegisterBase & { role: "tourist"; age: number });

export interface AuthSession {
  token: string;
  user: User;
}

export function toAuthUser(user: BackendUser): User {
  const role: Role = user.role === "operations_manager" ? "manager" : user.role;
  return { id: user.id, name: user.name, role };
}

export async function createAccount(body: RegisterRequest): Promise<BackendUser> {
  return requestBackend<BackendUser>("/users", "POST", body);
}

export async function getCurrentUser(): Promise<User> {
  return toAuthUser(await requestBackend<BackendUser>("/auth/me"));
}

// Exchanges credentials for a token and loads the user they belong to
export async function signIn(credentials: LoginRequest): Promise<AuthSession> {
  const { access_token: token } = await requestBackend<TokenResponse>(
    "/auth/login",
    "POST",
    credentials,
  );

  setToken(token);
  try {
    const user = await getCurrentUser();
    return { token, user };
  } catch (error) {
    setToken(null);
    throw error;
  }
}
