import { forwardRef } from "react";
import { cn } from "./cn";

type Variant = "primary" | "secondary" | "forest" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  forest: "btn-forest",
  ghost: "btn-ghost",
  danger: "btn-danger",
};

const sizes: Record<Size, string> = {
  sm: "min-h-9 px-3.5 text-xs",
  md: "min-h-11 px-5 text-sm",
  lg: "min-h-13 px-7 text-base",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ className, variant = "primary", size = "md", type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(variants[variant], sizes[size], className)}
      {...props}
    />
  );
});
