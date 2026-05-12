import { isValidReelUrl, normalizeReelUrl } from "./reel-url";
import { normalizeThumbnailUrl } from "./thumbnail-url";
import { cacheThumbnail } from "./thumbnail-cache";

async function extractViaYoutubeOembed(url: string): Promise<string | null> {
  try {
    const apiUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return normalizeThumbnailUrl(data?.thumbnail_url || null);
  } catch {
    return null;
  }
}

async function extractViaMicrolink(url: string): Promise<string | null> {
  try {
    const apiUrl = `https://api.microlink.io?url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    return normalizeThumbnailUrl(data?.data?.image?.url || null);
  } catch {
    return null;
  }
}

async function extractViaIframely(url: string): Promise<string | null> {
  const apiKey = process.env.IFRAMELY_API_KEY;
  if (!apiKey) return null;

  try {
    const apiUrl = `https://iframe.ly/api/iframely?url=${encodeURIComponent(url)}&api_key=${apiKey}&iframe=0&omit_script=1`;
    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    const thumb =
      data?.links?.thumbnail?.[0]?.href ??
      data?.meta?.["og:image"] ??
      data?.meta?.image ??
      null;
    return normalizeThumbnailUrl(thumb);
  } catch {
    return null;
  }
}

async function extractViaOgTags(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      },
      signal: AbortSignal.timeout(5000),
    });

    const html = await response.text();

    const match1 = html.match(
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i
    );
    if (match1) return normalizeThumbnailUrl(match1[1]);

    const match2 = html.match(
      /<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i
    );
    return normalizeThumbnailUrl(match2?.[1] || null);
  } catch {
    return null;
  }
}

async function extractRaw(url: string): Promise<string | null> {
  const parsed = normalizeReelUrl(url);

  if (parsed?.source === "youtube") {
    return (
      (await extractViaYoutubeOembed(url)) ??
      (await extractViaMicrolink(url)) ??
      (await extractViaIframely(url)) ??
      (await extractViaOgTags(url))
    );
  }

  if (isValidReelUrl(url)) {
    return (
      (await extractViaMicrolink(url)) ??
      (await extractViaIframely(url)) ??
      (await extractViaOgTags(url))
    );
  }

  return (await extractViaOgTags(url)) ?? (await extractViaIframely(url));
}

export async function extractThumbnail(url: string): Promise<string | null> {
  const raw = await extractRaw(url);
  if (!raw) return null;
  const cached = await cacheThumbnail(raw, url);
  return cached ?? raw;
}
