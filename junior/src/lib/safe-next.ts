/** Only allow same-site relative paths as a post sign-in destination. */
export function safeNext(value: unknown, fallback = "/draft"): string {
  if (typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/login") || value.startsWith("/auth")) return fallback;
  return value;
}
