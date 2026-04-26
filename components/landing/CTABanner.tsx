"use client"

import Link from "next/link"
import { useRef } from "react"
import { motion, useInView } from "framer-motion"

export default function CTABanner() {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-80px" })

  return (
    <section
      className="relative px-4 py-24 overflow-hidden"
      style={{ background: "#0D0D15" }}
    >
      {/* Background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] rounded-full"
          style={{
            background:
              "radial-gradient(ellipse, rgba(37,99,235,0.22) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(37,99,235,0.3), transparent)",
        }}
      />

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center gap-6"
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "#2563EB", fontFamily: "var(--font-inter)" }}
        >
          Get Started Today
        </span>

        <h2
          className="text-3xl sm:text-5xl font-extrabold leading-tight"
          style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
        >
          Your thoughts deserve
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #2563EB, #818CF8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            a safe home.
          </span>
        </h2>

        <p
          className="max-w-md text-base leading-relaxed"
          style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
        >
          Private. Encrypted. Intelligent. Start your journal today — it&apos;s
          free, and always will be for personal use.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mt-2">
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              color: "#fff",
              fontFamily: "var(--font-inter)",
              boxShadow:
                "0 0 36px rgba(37,99,235,0.5), 0 4px 16px rgba(0,0,0,0.4)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 60px rgba(37,99,235,0.75), 0 6px 24px rgba(0,0,0,0.5)"
              e.currentTarget.style.transform = "translateY(-3px)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 36px rgba(37,99,235,0.5), 0 4px 16px rgba(0,0,0,0.4)"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          >
            Start Writing for Free →
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#F0F0F0",
              fontFamily: "var(--font-inter)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.09)"
              e.currentTarget.style.transform = "translateY(-3px)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          >
            Already have a vault? Log in
          </Link>
        </div>

        <p
          className="text-xs mt-2"
          style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
        >
          No credit card. No tracking. No ads. Ever.
        </p>
      </motion.div>
    </section>
  )
}
