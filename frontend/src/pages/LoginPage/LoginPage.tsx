import { Navigate } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE, ROLE_LABEL } from "@/app/providers/auth/roles";
import type { User } from "@/app/providers/auth/roles";
import { Button } from "@/components/Button/Button";

// Mock users until the backend login (#47) and the real form (#95) exist.
const MOCK_USERS: User[] = [
  {
    name: "Laura Pérez",
    role: "guide",
    authorizations: [
      { packageId: 1, canGenerate: true, canValidate: false },
      { packageId: 2, canGenerate: false, canValidate: true },
    ],
  },
  { name: "Marta Rivas", role: "manager" },
  { name: "Daniel Ortega", role: "tourist" },
  { name: "Rosa Fernández", role: "admin" },
];

export function LoginPage() {
  const { user, login } = useAuth();

  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  return (
    <main>
      <h1>Iniciar sesión</h1>
      {MOCK_USERS.map(mock => (
        <Button key={mock.role} onClick={() => login(mock)}>
          Entrar como {ROLE_LABEL[mock.role].toLowerCase()}
        </Button>
      ))}
    </main>
  );
}
