export function sanitizeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/";
  }

  return value;
}
