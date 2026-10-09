import { ImageResponse } from "next/og";
import { brand } from "@/config/brand";

export const alt = `${brand.name}: NFC business cards`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social-sharing image: the brand on a card, in the site's colours. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f5f6f3", padding: 80, alignItems: "center", gap: 70 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: "#14231e", display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 22, height: 22, background: "#b38b3f", transform: "rotate(45deg)", borderRadius: 3 }} />
            {brand.name}
          </div>
          <div style={{ fontSize: 68, fontWeight: 700, color: "#14231e", lineHeight: 1.05, marginTop: 36 }}>One tap, and they have your details.</div>
        </div>
        <div style={{ width: 400, height: 252, borderRadius: 22, background: "#1f4d3f", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 32, color: "white" }}>
          <div style={{ width: 18, height: 18, background: "#b38b3f", transform: "rotate(45deg)", borderRadius: 3 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, fontWeight: 600 }}>Your Name</div>
            <div style={{ fontSize: 20, opacity: 0.7 }}>Your title</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
