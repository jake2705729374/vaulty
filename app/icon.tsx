// app/icon.tsx — App icon served at /icon.png (favicon + PWA icon)
// Next.js generates this as a PNG via ImageResponse at build/request time.
import { ImageResponse } from "next/og"

export const size        = { width: 512, height: 512 }
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:          512,
          height:         512,
          background:     "linear-gradient(145deg, #1a1535 0%, #0f0f1a 100%)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          borderRadius:   96,
        }}
      >
        {/* Stylised "V" — the Vaultly wordmark initial */}
        <div
          style={{
            fontSize:   300,
            fontWeight: 800,
            color:      "#7c6ef2",
            lineHeight: 1,
            marginTop:  20,
          }}
        >
          V
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  )
}
