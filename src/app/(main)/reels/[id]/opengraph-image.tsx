import { ImageResponse } from "next/og";
import { getReel } from "@/lib/actions";

export const runtime = "nodejs";
export const revalidate = 3600;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const reel = await getReel(id);

  if (!reel) {
    return new ImageResponse(
      (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#111827", color: "#9ca3af", fontSize: 32 }}>
          콘텐츠를 찾을 수 없습니다
        </div>
      ),
      { ...size }
    );
  }

  const categories = reel.categories.map(({ category }: { category: { name: string } }) => category.name);
  const tags = reel.tags.map(({ tag }: { tag: { name: string } }) => tag.name);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #1e1b4b 0%, #111827 50%, #1e1b4b 100%)",
          padding: 60,
        }}
      >
        {/* Thumbnail */}
        <div style={{ display: "flex", width: 340, height: 510, borderRadius: 20, overflow: "hidden", flexShrink: 0 }}>
          {reel.thumbnail ? (
            <img src={reel.thumbnail} width={340} height={510} style={{ objectFit: "cover" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", background: "#374151", fontSize: 64 }}>
              🎬
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 50, flex: 1, justifyContent: "center" }}>
          {/* Categories */}
          {categories.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
              {categories.map((name: string) => (
                <div key={name} style={{ background: "rgba(168,85,247,0.3)", color: "#c084fc", padding: "8px 20px", borderRadius: 30, fontSize: 24 }}>
                  {name}
                </div>
              ))}
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 24 }}>
              {tags.map((name: string) => (
                <div key={name} style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80", padding: "6px 16px", borderRadius: 30, fontSize: 20 }}>
                  #{name}
                </div>
              ))}
            </div>
          )}

          {/* Memo */}
          {reel.memo && (
            <div style={{ color: "#d1d5db", fontSize: 22, lineHeight: 1.6, marginBottom: 24 }}>
              {reel.memo.length > 100 ? reel.memo.slice(0, 100) + "..." : reel.memo}
            </div>
          )}

          {/* Visited badge */}
          {reel.visited && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
              <span style={{ color: "#7eff50", fontSize: 28 }}>★</span>
              <span style={{ color: "#7eff50", fontSize: 20 }}>방문/구매 완료</span>
            </div>
          )}

          {/* Branding */}
          <div style={{ display: "flex", alignItems: "center", marginTop: "auto" }}>
            <span style={{ color: "#a78bfa", fontSize: 32, fontWeight: 700 }}>Trovely</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
