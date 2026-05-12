export type ReelSource = "instagram" | "youtube";

const SUPPORTED_INSTAGRAM_PATHS = new Set(["reel", "reels", "p"]);
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

function normalizeSegment(value: string) {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function parseUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
}

export function normalizeInstagramUrl(input: string): string | null {
  const parsed = parseUrl(input);
  if (!parsed) return null;

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname.endsWith("instagram.com")) {
    return null;
  }

  const segments = parsed.pathname
    .split("/")
    .map(normalizeSegment)
    .filter(Boolean);

  const [kind, shortcode] = segments;
  if (!kind || !shortcode || !SUPPORTED_INSTAGRAM_PATHS.has(kind.toLowerCase())) {
    return null;
  }

  const canonicalKind = kind.toLowerCase() === "reels" ? "reel" : kind.toLowerCase();

  return `https://www.instagram.com/${canonicalKind}/${shortcode}/`;
}

export function isValidInstagramUrl(input: string): boolean {
  return normalizeInstagramUrl(input) !== null;
}

export function normalizeYoutubeUrl(input: string): string | null {
  const parsed = parseUrl(input);
  if (!parsed) return null;

  const hostname = parsed.hostname.toLowerCase();

  if (hostname === "youtu.be") {
    const segments = parsed.pathname.split("/").map(normalizeSegment).filter(Boolean);
    const videoId = segments[0];
    if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) return null;
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  if (!hostname.endsWith("youtube.com")) return null;

  const segments = parsed.pathname
    .split("/")
    .map(normalizeSegment)
    .filter(Boolean);

  if (segments[0]?.toLowerCase() === "shorts" && segments[1]) {
    const videoId = segments[1];
    if (!YOUTUBE_ID_PATTERN.test(videoId)) return null;
    return `https://www.youtube.com/shorts/${videoId}`;
  }

  if (parsed.pathname === "/watch") {
    const videoId = parsed.searchParams.get("v");
    if (!videoId || !YOUTUBE_ID_PATTERN.test(videoId)) return null;
    return `https://www.youtube.com/watch?v=${videoId}`;
  }

  return null;
}

export function isValidYoutubeUrl(input: string): boolean {
  return normalizeYoutubeUrl(input) !== null;
}

export function normalizeReelUrl(
  input: string
): { url: string; source: ReelSource } | null {
  const instagram = normalizeInstagramUrl(input);
  if (instagram) return { url: instagram, source: "instagram" };

  const youtube = normalizeYoutubeUrl(input);
  if (youtube) return { url: youtube, source: "youtube" };

  return null;
}

export function isValidReelUrl(input: string): boolean {
  return normalizeReelUrl(input) !== null;
}

export function detectSourceFromUrl(url: string): ReelSource | null {
  return normalizeReelUrl(url)?.source ?? null;
}

export function parseReelSource(value: string | undefined | null): ReelSource | undefined {
  if (value === "instagram" || value === "youtube") return value;
  return undefined;
}
