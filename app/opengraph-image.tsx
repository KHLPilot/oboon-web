import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function OpenGraphImage() {
  const notoSans = await readFile(
    join(
      process.cwd(),
      "node_modules/next/dist/compiled/@vercel/og/noto-sans-v27-latin-regular.ttf",
    ),
  );

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #f5efe6 0%, #eadcc7 42%, #d8bea0 100%)",
          color: "#1f2937",
          padding: "56px 64px",
          fontFamily: "SUIT",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-96px",
            right: "-56px",
            width: "360px",
            height: "360px",
            borderRadius: "9999px",
            background: "rgba(255, 255, 255, 0.35)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-88px",
            left: "-32px",
            width: "300px",
            height: "300px",
            borderRadius: "9999px",
            background: "rgba(163, 127, 89, 0.18)",
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            position: "relative",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "18px",
                height: "18px",
                borderRadius: "9999px",
                background: "#a37f59",
              }}
            />
            <div
              style={{
                fontSize: "28px",
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              OBOON
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "20px",
              maxWidth: "860px",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: "72px",
                fontWeight: 800,
                lineHeight: 1.05,
                letterSpacing: "-0.05em",
              }}
            >
              <span>Find listings.</span>
              <span>Compare better.</span>
            </div>
            <div
              style={{
                fontSize: "30px",
                lineHeight: 1.35,
                color: "rgba(31, 41, 55, 0.78)",
              }}
            >
              Korean new-home discovery platform
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: "24px",
              color: "rgba(31, 41, 55, 0.68)",
            }}
          >
            oboon.co.kr
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: "SUIT",
          data: notoSans,
          style: "normal",
          weight: 400,
        },
      ],
    },
  );
}
