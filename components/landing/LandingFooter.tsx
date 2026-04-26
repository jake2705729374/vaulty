import Link from "next/link"

const footerLinks = [
  { label: "Features",     href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms",        href: "/terms" },
  { label: "Contact",      href: "mailto:hello@vaultly.app" },
]

export default function LandingFooter() {
  return (
    <footer
      className="relative px-4 py-12"
      style={{
        background: "#0A0A0F",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div className="max-w-5xl mx-auto flex flex-col items-center gap-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg, #2563EB, #1D4ED8)" }}
          >
            V
          </div>
          <span
            className="text-base font-bold tracking-tight"
            style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
          >
            Vaultly
          </span>
        </div>

        <p
          className="text-xs text-center max-w-xs"
          style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
        >
          Your private journal, powered by AI. Write freely. Think clearly. Grow daily.
        </p>

        {/* Links */}
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
          {footerLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs transition-colors duration-200"
              style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div
          className="w-full h-px max-w-xs"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          }}
        />

        <p
          className="text-xs"
          style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
        >
          © {new Date().getFullYear()} Vaultly. Your data is encrypted and yours alone.
        </p>
      </div>
    </footer>
  )
}
