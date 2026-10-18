import { ImageResponse } from "next/og";
import { getGuide } from "@/lib/guides";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getGuide(slug);
  const title = guide?.title ?? "N1AMH AI";
  const outcome = guide?.outcome ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#4f46e5" }}>
          N1AMH AI{guide ? ` · ${guide.category}` : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 58, fontWeight: 700, color: "#111827", lineHeight: 1.15 }}>
            {title}
          </div>
          {outcome && (
            <div style={{ display: "flex", marginTop: 18, fontSize: 30, color: "#6b7280" }}>
              {outcome}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
