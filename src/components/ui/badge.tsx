import { cn } from "./cn";

type Tone = "brand" | "forest" | "gold" | "neutral" | "success" | "danger" | "info";

const tones: Record<Tone, string> = {
  brand: "bg-brand-soft text-brand-dark",
  forest: "bg-forest-soft text-forest",
  gold: "bg-amber-100 text-amber-900",
  neutral: "bg-sand text-muted",
  success: "bg-emerald-100 text-emerald-900",
  danger: "bg-red-100 text-red-900",
  info: "bg-sky-100 text-sky-900",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return <span className={cn("badge", tones[tone], className)} {...props} />;
}
