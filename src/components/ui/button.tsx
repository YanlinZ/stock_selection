import { Slot } from "@radix-ui/react-slot";
import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "default" | "ghost";
type ButtonSize = "default" | "sm" | "icon";

const variantClassName: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-[#F1D488]",
  ghost: "text-muted-foreground hover:bg-muted hover:text-foreground"
};

const sizeClassName: Record<ButtonSize, string> = {
  default: "h-10 px-4",
  sm: "h-9 px-3 text-sm",
  icon: "h-9 w-9 p-0"
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      asChild = false,
      className,
      size = "default",
      variant = "default",
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-50",
          variantClassName[variant],
          sizeClassName[size],
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
