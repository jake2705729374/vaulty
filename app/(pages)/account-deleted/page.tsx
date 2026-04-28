"use client"

import Link from "next/link"
import { motion } from "framer-motion"

// ── Floating particle ─────────────────────────────────────────────────────────
function Particle({ x, delay, duration }: { x: number; delay: number; duration: number }) {
  return (
    <motion.circle
      cx={x}
      cy={60}
      r={2.5}
      fill="#2563EB"
      initial={{ opacity: 0, cy: 60 }}
      animate={{ opacity: [0, 0.7, 0], cy: [60, 20, 5] }}
      transition={{ delay, duration, ease: "easeOut", repeat: Infinity, repeatDelay: 3 }}
    />
  )
}

// ── Animated vault lock ───────────────────────────────────────────────────────
function VaultLock() {
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.34, 1.36, 0.64, 1] }}
      className="relative"
    >
      {/* Glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)",
          filter: "blur(20px)",
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.6] }}
        transition={{ duration: 1.8, times: [0, 0.4, 1] }}
      />

      <svg
        width="120"
        height="140"
        viewBox="0 0 120 140"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Floating particles rising from the lock */}
        <Particle x={35} delay={1.2} duration={2.2} />
        <Particle x={60} delay={0.8} duration={2.6} />
        <Particle x={85} delay={1.5} duration={2.0} />

        {/* Shackle (top arc) — opens upward over time */}
        <motion.path
          d="M36 68V48C36 31.4 49.4 18 66 18C82.6 18 96 31.4 96 48V68"
          stroke="#2563EB"
          strokeWidth="9"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.9, ease: "easeOut", delay: 0.1 }}
        />

        {/* Shackle lifts open after drawing in */}
        <motion.path
          d="M36 68V48C36 31.4 49.4 18 66 18C82.6 18 96 31.4 96 48V68"
          stroke="#2563EB"
          strokeWidth="9"
          strokeLinecap="round"
          initial={{ y: 0, opacity: 1 }}
          animate={{ y: -14, opacity: [1, 1, 0] }}
          transition={{ duration: 1.0, ease: "easeInOut", delay: 1.6, times: [0, 0.6, 1] }}
        />

        {/* Lock body */}
        <motion.rect
          x="16"
          y="65"
          width="88"
          height="62"
          rx="12"
          fill="rgba(37,99,235,0.15)"
          stroke="#2563EB"
          strokeWidth="3"
          initial={{ opacity: 0, scaleY: 0.6 }}
          animate={{ opacity: 1, scaleY: 1 }}
          style={{ transformOrigin: "50% 100%" }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.5 }}
        />

        {/* Keyhole circle */}
        <motion.circle
          cx="60"
          cy="91"
          r="9"
          fill="#2563EB"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ transformOrigin: "60px 91px" }}
          transition={{ duration: 0.4, ease: "backOut", delay: 0.85 }}
        />

        {/* Keyhole slot */}
        <motion.rect
          x="56.5"
          y="96"
          width="7"
          height="18"
          rx="3.5"
          fill="#2563EB"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 1.0 }}
        />

        {/* Checkmark that fades in after the shackle opens */}
        <motion.path
          d="M42 96l12 12 24-20"
          stroke="#22C55E"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 2.4 }}
        />
      </svg>
    </motion.div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AccountDeletedPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center relative overflow-hidden"
      style={{ background: "#0A0A0F" }}
    >
      {/* Background glow */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(37,99,235,0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center max-w-md">

        {/* Animated lock */}
        <div className="mb-8">
          <VaultLock />
        </div>

        {/* Headline */}
        <motion.h1
          className="text-3xl font-bold mb-3 tracking-tight"
          style={{ fontFamily: "var(--font-sora)", color: "#F0F0F0" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.55, ease: "easeOut" }}
        >
          Your vault is closed.
        </motion.h1>

        {/* Body */}
        <motion.div
          className="space-y-3 mb-8"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.5, ease: "easeOut" }}
        >
          <p
            className="text-base leading-relaxed"
            style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
          >
            We&apos;re genuinely sad to see you go. Your account and everything in
            it — every entry, every reflection, every habit — has been permanently
            and completely deleted.
          </p>
          <p
            className="text-base leading-relaxed"
            style={{ color: "#8B8BA7", fontFamily: "var(--font-inter)" }}
          >
            Nothing remains on our servers. Your privacy is fully intact.
          </p>
        </motion.div>

        {/* Email notice */}
        <motion.div
          className="w-full mb-10 px-5 py-4 rounded-2xl flex items-center gap-3"
          style={{
            background: "rgba(37,99,235,0.07)",
            border: "1px solid rgba(37,99,235,0.18)",
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          {/* Envelope icon */}
          <svg
            viewBox="0 0 20 20"
            fill="none"
            stroke="#2563EB"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="20"
            height="20"
            className="shrink-0"
          >
            <rect x="2" y="4" width="16" height="13" rx="2" />
            <path d="M2 7l8 5 8-5" />
          </svg>
          <p
            className="text-sm text-left leading-snug"
            style={{ color: "#93B4FF", fontFamily: "var(--font-inter)" }}
          >
            A farewell email is on its way to you — we wanted to say a proper goodbye.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          className="flex flex-col sm:flex-row gap-3 w-full"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.45, ease: "easeOut" }}
        >
          <Link
            href="/register"
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white text-center transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              boxShadow: "0 0 20px rgba(37,99,235,0.35)",
              fontFamily: "var(--font-inter)",
            }}
          >
            Start fresh
          </Link>
          <Link
            href="/"
            className="flex-1 py-3 rounded-xl text-sm font-medium text-center transition-colors"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#8B8BA7",
              fontFamily: "var(--font-inter)",
            }}
          >
            Back to home
          </Link>
        </motion.div>

        {/* Closing note */}
        <motion.p
          className="mt-12 text-xs"
          style={{ color: "#3B3B52", fontFamily: "var(--font-inter)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7, duration: 0.6 }}
        >
          We hope Vaultly helped you on your journey. Take care of yourself. 🌿
        </motion.p>
      </div>
    </main>
  )
}
