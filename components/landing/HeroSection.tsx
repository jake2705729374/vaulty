"use client"

import Link from "next/link"
import { motion } from "framer-motion"

const stats = [
  { value: "AES-256", label: "Encrypted" },
  { value: "AI", label: "Therapist built-in" },
  { value: "100%", label: "Private" },
]

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-24 pb-16"
      style={{ background: "#0A0A0F" }}
    >
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="animate-orb-float absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.28) 0%, rgba(37,99,235,0.10) 45%, transparent 70%)",
            filter: "blur(70px)",
          }}
        />
        <div
          className="animate-orb-float-secondary absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 65%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="animate-orb-float-secondary absolute bottom-1/4 right-1/4 w-[350px] h-[350px] rounded-full"
          style={{
            background:
              "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 65%)",
            filter: "blur(90px)",
            animationDelay: "3s",
          }}
        />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-center max-w-4xl">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium"
          style={{
            background: "rgba(37,99,235,0.12)",
            border: "1px solid rgba(37,99,235,0.3)",
            color: "#93B4FF",
            fontFamily: "var(--font-inter)",
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ background: "#2563EB" }}
          />
          Private · Encrypted · AI-Powered
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.2 }}
          className="text-5xl sm:text-6xl md:text-7xl font-extrabold leading-[1.08] tracking-tight mb-6"
          style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
        >
          Write Freely.
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #2563EB, #818CF8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Think Clearly.
          </span>
          <br />
          Grow Daily.
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.35 }}
          className="max-w-xl text-base sm:text-lg leading-relaxed mb-10"
          style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
        >
          Vaultly is your private, AI-powered journal. Every thought encrypted,
          every insight revealed — a safe space that thinks alongside you.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.5 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              color: "#fff",
              fontFamily: "var(--font-inter)",
              boxShadow: "0 0 28px rgba(37,99,235,0.45), 0 2px 8px rgba(0,0,0,0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 50px rgba(37,99,235,0.7), 0 4px 16px rgba(0,0,0,0.4)"
              e.currentTarget.style.transform = "translateY(-2px)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 0 28px rgba(37,99,235,0.45), 0 2px 8px rgba(0,0,0,0.3)"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          >
            Start Writing for Free
            <span>→</span>
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#F0F0F0",
              fontFamily: "var(--font-inter)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.09)"
              e.currentTarget.style.transform = "translateY(-2px)"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.05)"
              e.currentTarget.style.transform = "translateY(0)"
            }}
          >
            See How It Works
          </a>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.7 }}
          className="mt-16 flex flex-wrap justify-center gap-x-10 gap-y-4"
        >
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center">
              <span
                className="text-2xl font-bold"
                style={{
                  fontFamily: "var(--font-sora)",
                  background: "linear-gradient(90deg, #F0F0F0, #93B4FF)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {s.value}
              </span>
              <span
                className="text-xs mt-0.5"
                style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute bottom-0 inset-x-0 h-32"
        style={{
          background: "linear-gradient(to top, #0A0A0F, transparent)",
        }}
      />
    </section>
  )
}
