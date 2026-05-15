import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "destructive" | "positive" | "secondary" | "warning";

const variantClassName: Record<BadgeVariant, string> = {
  default: "border-border bg-muted text-card-foreground",
  destructive: "border-destructive/40 bg-negative-surface text-destructive",
  positive: "border-positive/40 bg-positive-surface text-positive",
  secondary: "border-border bg-muted text-muted-foreground",
  warning: "border-primary/60 bg-primary/15 text-primary"
};

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
}) {
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center rounded border px-2 py-0.5 text-xs font-medium leading-tight",
        variantClassName[variant],
        className
      )}
      {...props}
    />
  );
}
