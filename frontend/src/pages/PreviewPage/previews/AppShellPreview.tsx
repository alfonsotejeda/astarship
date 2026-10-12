import { useState } from "react";
import { AuthContext } from "@/app/providers/auth/AuthContext";
import { ROLE_LABEL } from "@/app/providers/auth/roles";
import type { Role, User } from "@/app/providers/auth/roles";
import { AppShell } from "@/components/AppShell/AppShell";
import { Button } from "@/components/Button/Button";

const USERS: Record<Role, User> = {
  guide: { name: "Laura Pérez", role: "guide" },
  manager: { name: "Marta Rivas", role: "manager" },
  tourist: { name: "Daniel Ortega", role: "tourist" },
  admin: { name: "Rosa Fernández", role: "admin" },
};

const ROLES = Object.keys(USERS) as Role[];

export function AppShellPreview() {
  const [role, setRole] = useState<Role>("guide");
  const auth = { user: USERS[role], login: () => {}, logout: () => {} };
  const content = <p>Contenido de la página.</p>;

  return (
    <AuthContext value={auth}>
      <section className="preview-section">
        <h2>Rol</h2>
        <div className="preview-row">
          {ROLES.map(option => (
            <Button
              key={option}
              size="sm"
              variant={option === role ? "primary" : "secondary"}
              onClick={() => setRole(option)}
            >
              {ROLE_LABEL[option]}
            </Button>
          ))}
        </div>
      </section>

      <section className="preview-section">
        <h2>Escritorio · con contador en Solicitudes</h2>
        <div className="preview-frame">
          <AppShell layout="desktop" counts={{ requests: 2 }}>{content}</AppShell>
        </div>
      </section>

      <section className="preview-section">
        <h2>Móvil · 400px</h2>
        <div className="preview-frame preview-frame--phone">
          <AppShell layout="mobile" counts={{ requests: 2 }}>{content}</AppShell>
        </div>
      </section>
    </AuthContext>
  );
}
