import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6366f1 0%, #a855f7 100%)",
          borderRadius: 96,
          fontSize: 260,
          fontWeight: 700,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        L
      </div>
    ),
    size
  );
}
