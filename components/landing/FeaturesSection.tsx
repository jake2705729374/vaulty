"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

const features = [
  {
    id: "encryption",
    eyebrow: "Privacy First",
    title: "Military-Grade\nEncryption",
    description:
      "Every word you write is AES-256 encrypted on your device before it ever reaches our servers. We literally cannot read your journal — and that's by design. Your secrets stay secret.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <rect x="10" y="22" width="28" height="20" rx="4" stroke="#2563EB" strokeWidth="2.5" />
        <path d="M16 22V16a8 8 0 0116 0v6" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="24" cy="32" r="3" fill="#2563EB" />
        <path d="M24 35v4" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
    visual: (
      <div className="relative flex items-center justify-center w-full h-64">
        <div
          className="absolute w-48 h-48 rounded-full"
          style={{
            background: "radial-gradient(circle, rgba(37,99,235,0.2) 0%, transparent 70%)",
            filter: "blur(30px)",
          }}
        />
        <div
          className="relative flex flex-col items-center gap-3 p-8 rounded-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(37,99,235,0.2)",
          }}
        >
          <svg viewBox="0 0 64 64" fill="none" className="w-20 h-20">
            <rect x="12" y="28" width="40" height="28" rx="6" fill="rgba(37,99,235,0.15)" stroke="#2563EB" strokeWidth="2" />
            <path d="M20 28V22a12 12 0 0124 0v6" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="32" cy="42" r="4" fill="#2563EB" />
            <path d="M32 46v5" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <span className="text-xs font-mono" style={{ color: "#2563EB" }}>
            AES-256-GCM · Client-Side
          </span>
        </div>
      </div>
    ),
  },
  {
    id: "ai",
    eyebrow: "AI Therapist",
    title: "An AI That\nActually Listens",
    description:
      "Vaultly's built-in AI reflects on your entries, asks thoughtful follow-up questions, and helps you see patterns you might miss. Non-judgmental. Always available. Never clinical.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <rect x="6" y="10" width="24" height="18" rx="4" stroke="#2563EB" strokeWidth="2.5" />
        <path d="M10 34l-4 6h16l-4-6" stroke="#2563EB" strokeWidth="2" />
        <rect x="22" y="20" width="20" height="16" rx="4" stroke="#2563EB" strokeWidth="2.5" />
        <circle cx="28" cy="28" r="1.5" fill="#2563EB" />
        <circle cx="32" cy="28" r="1.5" fill="#2563EB" />
        <circle cx="36" cy="28" r="1.5" fill="#2563EB" />
      </svg>
    ),
    visual: (
      <div className="relative flex flex-col gap-3 w-full max-w-xs mx-auto">
        {[
          { from: "ai", text: "How did that conversation make you feel?" },
          { from: "user", text: "Honestly, relieved but also a little guilty..." },
          { from: "ai", text: "That's a really common pairing. Can you tell me more about the guilt?" },
        ].map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.from === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className="max-w-[85%] px-4 py-2.5 rounded-2xl text-xs leading-relaxed"
              style={{
                background:
                  msg.from === "ai"
                    ? "rgba(37,99,235,0.12)"
                    : "rgba(255,255,255,0.07)",
                border:
                  msg.from === "ai"
                    ? "1px solid rgba(37,99,235,0.2)"
                    : "1px solid rgba(255,255,255,0.08)",
                color: msg.from === "ai" ? "#93B4FF" : "#F0F0F0",
                fontFamily: "var(--font-inter)",
                borderRadius: msg.from === "ai" ? "4px 18px 18px 18px" : "18px 4px 18px 18px",
              }}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    id: "mood",
    eyebrow: "Mood Tracking",
    title: "Understand Your\nEmotional Landscape",
    description:
      "Log your mood with every entry. Over weeks and months, Vaultly surfaces the patterns that shape your life — what energizes you, what weighs you down, and where you're quietly growing.",
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10">
        <polyline points="6,36 14,24 22,30 30,16 38,20 44,10" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="14" cy="24" r="3" fill="#2563EB" />
        <circle cx="30" cy="16" r="3" fill="#2563EB" />
        <circle cx="44" cy="10" r="3" fill="#2563EB" />
      </svg>
    ),
    visual: (
      <div className="relative flex flex-col gap-3 w-full px-2">
        {[
          { day: "Mon", mood: "Great", pct: 90, color: "#22C55E" },
          { day: "Tue", mood: "Good",  pct: 70, color: "#2563EB" },
          { day: "Wed", mood: "Okay",  pct: 50, color: "#8B8BA7" },
          { day: "Thu", mood: "Good",  pct: 72, color: "#2563EB" },
          { day: "Fri", mood: "Great", pct: 88, color: "#22C55E" },
        ].map((row) => (
          <div key={row.day} className="flex items-center gap-3">
            <span
              className="w-8 text-xs text-right shrink-0"
              style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
            >
              {row.day}
            </span>
            <div
              className="flex-1 h-5 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.05)" }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${row.pct}%`,
                  background: `linear-gradient(90deg, ${row.color}99, ${row.color})`,
                }}
              />
            </div>
            <span
              className="w-10 text-xs shrink-0"
              style={{ color: row.color, fontFamily: "var(--font-inter)" }}
            >
              {row.mood}
            </span>
          </div>
        ))}
      </div>
    ),
  },
]

function FeatureRow({
  feature,
  reverse,
  index,
}: {
  feature: (typeof features)[number]
  reverse: boolean
  index: number
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 48 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay: index * 0.1, ease: "easeOut" }}
      className={`flex flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"} items-center gap-12 py-16`}
    >
      {/* Text */}
      <div className="flex-1 flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl"
            style={{
              background: "rgba(37,99,235,0.1)",
              border: "1px solid rgba(37,99,235,0.2)",
            }}
          >
            {feature.icon}
          </div>
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#2563EB", fontFamily: "var(--font-inter)" }}
          >
            {feature.eyebrow}
          </span>
        </div>

        <h3
          className="text-3xl sm:text-4xl font-bold leading-tight whitespace-pre-line"
          style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
        >
          {feature.title}
        </h3>

        <p
          className="text-base leading-relaxed max-w-md"
          style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
        >
          {feature.description}
        </p>
      </div>

      {/* Visual */}
      <div
        className="flex-1 w-full max-w-sm rounded-2xl p-8"
        style={{
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {feature.visual}
      </div>
    </motion.div>
  )
}

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative px-4 py-24"
      style={{ background: "#0A0A0F" }}
    >
      {/* Section label */}
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-4">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#2563EB", fontFamily: "var(--font-inter)" }}
          >
            Everything You Need
          </span>
        </div>
        <h2
          className="text-3xl sm:text-4xl font-bold text-center mb-2"
          style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
        >
          Built for privacy. Designed for growth.
        </h2>
        <p
          className="text-center max-w-xl mx-auto text-base"
          style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
        >
          Every feature exists for one reason: to make journaling feel safe, meaningful, and worth coming back to.
        </p>

        <div
          className="mt-6 mx-auto h-px max-w-xs"
          style={{
            background: "linear-gradient(90deg, transparent, rgba(37,99,235,0.4), transparent)",
          }}
        />

        <div className="mt-8 divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
          {features.map((f, i) => (
            <FeatureRow key={f.id} feature={f} reverse={i % 2 !== 0} index={i} />
          ))}
        </div>
      </div>
    </section>
  )
}
