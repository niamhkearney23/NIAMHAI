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
          background: "#0d0c0a",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 130, fontWeight: 900, color: "#f6f1e4" }}>
          N<span style={{ color: "#ff5a1f" }}>1</span>AMH
          <span style={{ fontSize: 52, marginLeft: 24, alignSelf: "flex-start", marginTop: 24 }}>
            AI
          </span>
        </div>
        <div style={{ display: "flex", marginTop: 24, fontSize: 40, color: "#f6f1e4cc" }}>
          {site.tagline}
        </div>
      </div>
    ),
    { ...size }
  );
}
