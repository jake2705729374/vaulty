"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"

const steps = [
  {
    number: "01",
    title: "Create Your Vault",
    description:
      "Sign up and set your master password. It's the only key to your journal — not even we have a copy. Lose it and the entries are locked forever. That's the point.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
        <circle cx="20" cy="20" r="18" stroke="#2563EB" strokeWidth="2" />
        <path d="M13 20h14M20 13v14" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Write Without Fear",
    description:
      "Open your journal and write anything. Entries are encrypted the moment you begin typing, before they ever leave your device. Say what you actually feel.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
        <path d="M10 28l4-1 14-14-3-3-14 14-1 4z" stroke="#2563EB" strokeWidth="2" strokeLinejoin="round" />
        <path d="M25 11l4 4" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
        <path d="M10 32h20" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Reflect & Grow",
    description:
      "Vaultly's AI companion reads between the lines, surfaces emotional patterns, and helps you understand yourself a little better every single day. Without judgment. Without pressure.",
    icon: (
      <svg viewBox="0 0 40 40" fill="none" className="w-8 h-8">
        <path d="M20 8C13.4 8 8 13.4 8 20s5.4 12 12 12 12-5.4 12-12S26.6 8 20 8z" stroke="#2563EB" strokeWidth="2" />
        <path d="M20 14v8l5 3" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

export default function HowItWorksSection() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section
      id="how-it-works"
      className="relative px-4 py-24"
      style={{ background: "#0D0D15" }}
    >
      {/* Top divider glow */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(37,99,235,0.3), transparent)",
        }}
      />

      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#2563EB", fontFamily: "var(--font-inter)" }}
          >
            Simple by Design
          </span>
          <h2
            className="mt-3 text-3xl sm:text-4xl font-bold"
            style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
          >
            Up and writing in 3 steps
          </h2>
          <p
            className="mt-3 max-w-md mx-auto text-base"
            style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
          >
            No setup. No complexity. Just you and a safe place to think.
          </p>
        </div>

        {/* Steps */}
        <motion.div
          ref={ref}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.15, ease: "easeOut" }}
              className="relative flex flex-col gap-5 p-8 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Connector line for desktop */}
              {i < steps.length - 1 && (
                <div
                  className="hidden md:block absolute top-14 -right-4 w-8 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(37,99,235,0.4), transparent)",
                  }}
                />
              )}

              {/* Step number */}
              <span
                className="text-5xl font-extrabold leading-none select-none"
                style={{
                  fontFamily: "var(--font-sora)",
                  background: "linear-gradient(90deg, rgba(37,99,235,0.4), transparent)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {step.number}
              </span>

              <div
                className="p-3 rounded-xl w-fit"
                style={{
                  background: "rgba(37,99,235,0.1)",
                  border: "1px solid rgba(37,99,235,0.2)",
                }}
              >
                {step.icon}
              </div>

              <h3
                className="text-xl font-bold"
                style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
              >
                {step.title}
              </h3>

              <p
                className="text-sm leading-relaxed"
                style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
              >
                {step.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Bottom glow */}
      <div
        className="absolute bottom-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(37,99,235,0.3), transparent)",
        }}
      />
    </section>
  )
}
