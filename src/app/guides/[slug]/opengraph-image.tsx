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
          background: "#0d0c0a",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 900, color: "#ff5a1f" }}>
          N<span>1</span>AMH AI{guide ? ` / ${guide.category}` : ""}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 900,
              color: "#f6f1e4",
              lineHeight: 1.1,
            }}
          >
            {title}
          </div>
          {outcome && (
            <div style={{ display: "flex", marginTop: 20, fontSize: 32, color: "#f6f1e4cc" }}>
              {outcome}
            </div>
          )}
        </div>
      </div>
    ),
    { ...size }
  );
}
