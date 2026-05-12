"use client";

import type { ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";

type ConfirmSubmitButtonProps = Omit<ButtonProps, "type"> & {
  children: ReactNode;
  confirmMessage: string;
};

export function ConfirmSubmitButton({
  children,
  confirmMessage,
  onClick,
  ...props
}: ConfirmSubmitButtonProps) {
  return (
    <Button
      onClick={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
      type="submit"
      {...props}
    >
      {children}
    </Button>
  );
}
