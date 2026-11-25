import { isValidReelUrl, normalizeReelUrl } from "./reel-url";
import { normalizeThumbnailUrl } from "./thumbnail-url";
import { cacheThumbnail } from "./thumbnail-cache";
import { captionFromMicrolink, captionFromOembed } from "./caption";

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

async function fetchJson(apiUrl: string, timeoutMs: number): Promise<unknown> {
  try {
    const response = await fetch(apiUrl, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * 새로 저장할 때 쓰는 미리보기: 썸네일과 캡션을 한 번의 요청으로 받는다
 * (microlink 하루 요청 수가 적어서 썸네일, 캡션을 따로 부르지 않는다).
 * 썸네일만 못 받으면 기존 순서(Iframely, og 태그)로 썸네일만 다시 찾는다.
 */
export async function extractPreview(url: string): Promise<{ thumbnail: string | null; caption: string | null }> {
  const parsed = normalizeReelUrl(url);
  let raw: string | null = null;
  let caption: string | null = null;

  if (parsed?.source === "youtube") {
    const data = await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`, 5000);
    raw = normalizeThumbnailUrl((data as { thumbnail_url?: string } | null)?.thumbnail_url || null);
    caption = captionFromOembed(data);
  } else if (isValidReelUrl(url)) {
    const data = await fetchJson(`https://api.microlink.io?url=${encodeURIComponent(url)}`, 10000);
    raw = normalizeThumbnailUrl((data as { data?: { image?: { url?: string } } } | null)?.data?.image?.url || null);
    caption = captionFromMicrolink(data);
  }

  if (!raw) raw = (await extractViaIframely(url)) ?? (await extractViaOgTags(url));
  if (!raw) return { thumbnail: null, caption };
  const cached = await cacheThumbnail(raw, url);
  return { thumbnail: cached ?? raw, caption };
}
