import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#ffffff",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 110, fontWeight: 700, color: "#111827" }}>
          N<span style={{ color: "#4f46e5" }}>1</span>AMH
          <span style={{ fontSize: 46, marginLeft: 20, alignSelf: "flex-start", marginTop: 20, color: "#6b7280" }}>
            AI
          </span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 36, color: "#6b7280" }}>
          {site.tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
