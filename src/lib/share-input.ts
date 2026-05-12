import { isValidReelUrl } from "./reel-url";

const URL_PATTERN = /https?:\/\/[^\s]+/g;

export function extractSharedReelUrl(input: {
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

    if (isValidReelUrl(trimmed)) {
      return trimmed;
    }

    const matches = trimmed.match(URL_PATTERN);
    if (matches) {
      for (const url of matches) {
        const stripped = url.replace(/[.,;)]+$/, "");
        if (isValidReelUrl(stripped)) {
          return stripped;
        }
      }
    }
  }

  return "";
}
