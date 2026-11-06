import { Skeleton } from "@/components/Skeleton/Skeleton";

export function average(values: number[]) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function StatsSkeleton({ count }: { count: number }) {
  return (
    <div className="ratings__stats" aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <Skeleton key={index} height={96} />
      ))}
    </div>
  );
}
