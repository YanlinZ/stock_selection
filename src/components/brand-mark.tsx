import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  title = "stock_selection logo mark"
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("h-9 w-9 shrink-0", className)}
      role={title ? "img" : undefined}
      viewBox="0 0 256 256"
    >
      <rect fill="#D6B25E" height="256" rx="56" width="256" />
      <path
        d="M69 156L104 120L129 143L187 82"
        fill="none"
        stroke="#090806"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="18"
      />
      <path
        d="M69 184H187"
        fill="none"
        opacity="0.32"
        stroke="#090806"
        strokeLinecap="round"
        strokeWidth="12"
      />
      <circle cx="187" cy="82" fill="#090806" r="12" />
      <path
        d="M44 64C44 52.9543 52.9543 44 64 44H192C203.046 44 212 52.9543 212 64"
        fill="none"
        opacity="0.5"
        stroke="#F1D488"
        strokeLinecap="round"
        strokeWidth="6"
      />
    </svg>
  );
}
