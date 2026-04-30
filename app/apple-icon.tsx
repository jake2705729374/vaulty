// app/apple-icon.tsx — Apple touch icon served at /apple-icon.png
// Same design as app/icon.tsx but sized 180×180 as Apple recommends.
import { ImageResponse } from "next/og"

export const size        = { width: 180, height: 180 }
export const contentType = "image/png"

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width:          180,
          height:         180,
          background:     "linear-gradient(145deg, #1a1535 0%, #0f0f1a 100%)",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          // No border-radius — iOS masks to its own squircle shape
        }}
      >
        <div
          style={{
            fontSize:   108,
            fontWeight: 800,
            color:      "#7c6ef2",
            lineHeight: 1,
            marginTop:  8,
          }}
        >
          V
        </div>
      </div>
    ),
    { width: 180, height: 180 },
  )
}
