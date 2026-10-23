import { cn } from "./cn";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-line bg-surface/50 px-6 py-12 text-center", className)}>
      <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-soft text-brand-dark">
        <Icon className="h-6 w-6" />
      </span>
      <p className="mt-4 font-display text-xl font-semibold text-ink">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
