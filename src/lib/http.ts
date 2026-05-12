export function sanitizeNextPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return "/";
  }

  return value;
}

export function createLoginPath(nextPath = "/", error?: string) {
  const params = new URLSearchParams();
  const sanitizedNextPath = sanitizeNextPath(nextPath);

  if (error) {
    params.set("error", error);
  }

  if (sanitizedNextPath !== "/") {
    params.set("next", sanitizedNextPath);
  }

  const query = params.toString();

  return query ? `/login?${query}` : "/login";
}
