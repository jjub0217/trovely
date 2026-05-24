import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

const BUCKET = "reel-thumbnails";

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function getClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export function isCachedThumbnailUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  return url.startsWith(`${base}/storage/v1/object/public/${BUCKET}/`);
}

export async function cacheThumbnail(
  externalUrl: string,
  stableKey: string
): Promise<string | null> {
  if (isCachedThumbnailUrl(externalUrl)) {
    return externalUrl;
  }

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(externalUrl, {
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok) {
        // 4xx = permanent (missing resource) -> retry is pointless. Only retry 5xx.
        if (response.status >= 400 && response.status < 500) return null;
        throw new Error(`status ${response.status}`);
      }

      const contentType =
        response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "image/jpeg";
      if (!contentType.startsWith("image/")) return null; // not an image -> permanent

      const ext = MIME_EXT[contentType] ?? "jpg";

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      if (buffer.byteLength === 0) throw new Error("empty body");

      const hash = createHash("sha256").update(stableKey).digest("hex").slice(0, 32);
      const path = `${hash}.${ext}`;

      const supabase = getClient();
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, { contentType, upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
      return data.publicUrl;
    } catch (err) {
      console.error(`[cacheThumbnail] attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);
      if (attempt === MAX_ATTEMPTS) return null;
      await new Promise((r) => setTimeout(r, 500 * attempt)); // 0.5s, 1.0s backoff
    }
  }
  return null;
}
