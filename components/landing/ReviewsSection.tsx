"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

const reviews = [
  {
    quote:
      "I've tried every journaling app out there. Nothing comes close to Vaultly's combination of privacy and intelligence. It genuinely changed my morning routine.",
    name: "Marcus T.",
    role: "Software Engineer",
    initials: "MT",
    color: "#2563EB",
  },
  {
    quote:
      "The AI therapist feature is genuinely different. It asks exactly the right follow-up questions. I've had realizations in here I never expected from an app.",
    name: "Priya K.",
    role: "Product Designer",
    initials: "PK",
    color: "#7C3AED",
  },
  {
    quote:
      "I work in healthcare and needed something I could actually trust with my personal writing. Vaultly's encryption is the real deal. This is the only app I'd recommend.",
    name: "Dr. Sarah Chen",
    role: "Physician",
    initials: "SC",
    color: "#0EA5E9",
  },
  {
    quote:
      "I was skeptical about AI in journaling. Now I can't imagine writing without it. It's like having a thoughtful friend available at 2am who never judges you.",
    name: "James R.",
    role: "Writer",
    initials: "JR",
    color: "#059669",
  },
  {
    quote:
      "The mood tracking showed me patterns I never would have noticed on my own. I finally understood why certain weeks felt so heavy. Life-changing, genuinely.",
    name: "Alex M.",
    role: "High School Teacher",
    initials: "AM",
    color: "#D97706",
  },
  {
    quote:
      "The design alone is worth it. Dark mode, beautiful themes, smooth animations. Writing in Vaultly feels like it actually matters — because it does.",
    name: "Naomi L.",
    role: "UX Designer",
    initials: "NL",
    color: "#DB2777",
  },
]

function Stars() {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="#F59E0B">
          <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z" />
        </svg>
      ))}
    </div>
  )
}

export default function ReviewsSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-60px" })

  return (
    <section
      id="reviews"
      className="relative px-4 py-24"
      style={{ background: "#0A0A0F" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#2563EB", fontFamily: "var(--font-inter)" }}
          >
            From Our Community
          </span>
          <h2
            className="mt-3 text-3xl sm:text-4xl font-bold"
            style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
          >
            Real people. Real growth.
          </h2>
          <p
            className="mt-3 max-w-sm mx-auto text-base"
            style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
          >
            Join thousands of journalers who write freely in Vaultly every day.
          </p>
        </div>

        {/* Grid */}
        <motion.div
          ref={ref}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {reviews.map((review, i) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 32 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.08, ease: "easeOut" }}
              className="flex flex-col gap-5 p-6 rounded-2xl transition-all duration-300"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = `${review.color}40`
                e.currentTarget.style.background = "rgba(255,255,255,0.04)"
                e.currentTarget.style.transform = "translateY(-4px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"
                e.currentTarget.style.background = "rgba(255,255,255,0.025)"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              <Stars />

              <p
                className="text-sm leading-relaxed flex-1"
                style={{ color: "#C4C4D4", fontFamily: "var(--font-inter)" }}
              >
                &ldquo;{review.quote}&rdquo;
              </p>

              <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                  style={{ background: `${review.color}22`, border: `1px solid ${review.color}44`, color: review.color }}
                >
                  {review.initials}
                </div>
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: "#F0F0F0", fontFamily: "var(--font-inter)" }}
                  >
                    {review.name}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
                  >
                    {review.role}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
