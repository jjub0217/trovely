import { normalizeInstagramUrl } from "./reel-url";

const URL_PATTERN = /https?:\/\/[^\s]+/g;

export function extractSharedInstagramUrl(input: {
  url?: string | string[];
  title?: string | string[];
  text?: string | string[];
}): string {
  const candidates: string[] = [];
  for (const value of [input.url, input.title, input.text]) {
    if (!value) continue;
    if (Array.isArray(value)) candidates.push(...value);
    else candidates.push(value);
  }

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (!trimmed) continue;

    if (normalizeInstagramUrl(trimmed)) {
      return trimmed;
    }

    const matches = trimmed.match(URL_PATTERN);
    if (matches) {
      for (const url of matches) {
        const stripped = url.replace(/[.,;)]+$/, "");
        if (normalizeInstagramUrl(stripped)) {
          return stripped;
        }
      }
    }
  }

  return "";
}
