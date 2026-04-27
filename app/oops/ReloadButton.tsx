"use client"

export default function ReloadButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="w-full sm:w-auto inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium transition-colors"
      style={{
        background: "var(--color-surface-2, #1a1a26)",
        border: "1px solid var(--color-border, #272736)",
        color: "var(--color-ink, #f0f0f0)",
      }}
    >
      Try again
    </button>
  )
}
