export function isRejectedThumbnailUrl(input: string | null | undefined): boolean {
  if (!input) return true;
  if (input.startsWith("data:image/")) return false;

  try {
    const url = new URL(input);
    const hostname = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    const full = `${hostname}${pathname}`;

    if (hostname === "cdninstagram.com" || hostname.endsWith(".cdninstagram.com")) {
      return false;
    }

    if (hostname.includes("instagram")) {
      return true;
    }

    return ["favicon", "apple-touch-icon", "android-chrome", "icon", "logo", "glyph", "static/images"].some(
      (pattern) => full.includes(pattern)
    );
  } catch {
    return true;
  }
}

export function normalizeThumbnailUrl(input: string | null | undefined): string | null {
  return isRejectedThumbnailUrl(input) ? null : input ?? null;
}
