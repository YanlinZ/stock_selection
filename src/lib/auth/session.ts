export const ACCESS_COOKIE_NAME = "stock_selection_access";
export const ACCESS_COOKIE_CLEAR_PATHS = [
  "/",
  "/settings",
  "/dashboard",
  "/health",
  "/api"
] as const;

const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export async function createAccessToken(
  authSecret = process.env.AUTH_SECRET,
  accessPassword = process.env.APP_ACCESS_PASSWORD
) {
  if (!authSecret || !accessPassword) {
    return "";
  }

  return sha256(`${authSecret}:${accessPassword}`);
}

export async function isValidAccessToken(token: string | undefined) {
  if (!token) {
    return false;
  }

  const expectedToken = await createAccessToken();

  if (!expectedToken) {
    return false;
  }

  return timingSafeEqual(token, expectedToken);
}

export async function findValidAccessToken(
  tokens: Iterable<string | undefined>
) {
  for (const token of tokens) {
    if (await isValidAccessToken(token)) {
      return token;
    }
  }

  return undefined;
}

export function passwordsMatch(input: string, expected: string) {
  return timingSafeEqual(input, expected);
}

export function getAccessCookieOptions() {
  return {
    httpOnly: true,
    maxAge: ACCESS_COOKIE_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

export function getExpiredAccessCookieOptions(path: string) {
  return {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production"
  };
}

type AccessCookieOptions =
  | ReturnType<typeof getAccessCookieOptions>
  | ReturnType<typeof getExpiredAccessCookieOptions>;

export function serializeAccessCookie(
  value: string,
  options: AccessCookieOptions
) {
  const parts = [`${ACCESS_COOKIE_NAME}=${encodeURIComponent(value)}`];

  if ("path" in options) {
    parts.push(`Path=${options.path}`);
  }

  if ("expires" in options) {
    parts.push(`Expires=${options.expires.toUTCString()}`);
  }

  if ("maxAge" in options) {
    parts.push(`Max-Age=${options.maxAge}`);
  }

  if (options.secure) {
    parts.push("Secure");
  }

  if (options.httpOnly) {
    parts.push("HttpOnly");
  }

  parts.push(`SameSite=${formatSameSite(options.sameSite)}`);

  return parts.join("; ");
}

function formatSameSite(value: "lax") {
  return value === "lax" ? "Lax" : value;
}

async function sha256(value: string) {
  const data = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(left: string, right: string) {
  if (left.length === 0 || right.length === 0) {
    return false;
  }

  let mismatch = left.length ^ right.length;
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    mismatch |=
      left.charCodeAt(index % left.length) ^ right.charCodeAt(index % right.length);
  }

  return mismatch === 0;
}
