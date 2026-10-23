import { cn } from "./cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} aria-hidden="true" />;
}

export function CardSkeleton() {
  return (
    <div className="card overflow-hidden p-3">
      <Skeleton className="aspect-[4/3] w-full" />
      <Skeleton className="mt-4 h-4 w-3/4" />
      <Skeleton className="mt-2 h-3 w-1/2" />
      <div className="mt-4 flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-9 w-9 rounded-full" />
      </div>
    </div>
  );
}
