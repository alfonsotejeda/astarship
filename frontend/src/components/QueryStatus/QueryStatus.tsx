import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { Panel } from "@/components/Panel/Panel";
import { Skeleton } from "@/components/Skeleton/Skeleton";

export function LoadingPanel({ rows = 5 }: { rows?: number }) {
  return (
    <Panel aria-busy="true">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} height={36} />
      ))}
    </Panel>
  );
}

export function LoadError({ title, error, onRetry }: { title: string; error: Error | null; onRetry: () => void }) {
  return (
    <Alert
      tone="bad"
      title={title}
      action={
        <Button size="sm" onClick={onRetry}>
          Reintentar
        </Button>
      }
    >
      {error?.message}
    </Alert>
  );
}
