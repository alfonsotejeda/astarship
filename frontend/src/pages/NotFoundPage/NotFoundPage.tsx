import { useNavigate } from "react-router";
import { useCurrentUser } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";

export function NotFoundPage() {
  const user = useCurrentUser();
  const navigate = useNavigate();

  return (
    <>
      <PageHeader title="Página no encontrada" />
      <Panel>
        <EmptyState
          icon="search"
          title="Esta página no existe"
          action={
            <Button variant="primary" onClick={() => navigate(HOME_BY_ROLE[user.role])}>
              Ir al inicio
            </Button>
          }
        >
          Puede que el enlace esté mal escrito o que la página haya cambiado de dirección.
        </EmptyState>
      </Panel>
    </>
  );
}
