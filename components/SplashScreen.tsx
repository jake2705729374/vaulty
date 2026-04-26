"use client"

import { useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

// ── Props ─────────────────────────────────────────────────────────────────
interface SplashScreenProps {
  /** Display name loaded from prefs — may arrive a beat after mount */
  name:    string | null
  visible: boolean
  onDone:  () => void
}

// How long the splash holds before auto-dismissing
const HOLD_MS = 2600

// ── Spring easing for each letter ─────────────────────────────────────────
const letterEase = [0.16, 1, 0.3, 1] as const   // custom spring-like cubic-bezier

// ── SplashScreen ─────────────────────────────────────────────────────────
export default function SplashScreen({ name, visible, onDone }: SplashScreenProps) {

  // Auto-dismiss after HOLD_MS
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onDone, HOLD_MS)
    return () => clearTimeout(t)
  }, [visible, onDone])

  const letters = (name ?? "").split("")

  // Subtitle delay: after last letter finishes + a short pause
  const subDelay = name ? 0.5 + letters.length * 0.055 + 0.2 : 0.75

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          // Whole screen fades out on exit
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.65, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
          style={{ backgroundColor: "#050508" }}
          onClick={onDone}
          aria-label="Welcome screen — tap to skip"
          role="status"
        >

          {/* ── Fluid blue blobs ──────────────────────────────────────────── */}

          {/* Blob 1 — large blue, top-left */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width:      640,
              height:     640,
              background: "radial-gradient(circle, rgba(59,130,246,0.30) 0%, transparent 65%)",
              filter:     "blur(72px)",
              top:        "-18%",
              left:       "-14%",
            }}
            animate={{
              x:     [0,  55, -30,  18,   0],
              y:     [0, -45,  65, -22,   0],
              scale: [1, 1.07, 0.96, 1.04, 1],
            }}
            transition={{
              duration:   16,
              ease:       "easeInOut",
              repeat:     Infinity,
              repeatType: "mirror",
            }}
          />

          {/* Blob 2 — indigo/violet, bottom-right */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width:      500,
              height:     500,
              background: "radial-gradient(circle, rgba(99,102,241,0.26) 0%, transparent 65%)",
              filter:     "blur(80px)",
              bottom:     "-12%",
              right:      "-10%",
            }}
            animate={{
              x:     [0, -65,  40, -18,   0],
              y:     [0,  55, -35,  22,   0],
              scale: [1, 0.94, 1.09, 0.97, 1],
            }}
            transition={{
              duration:   18,
              ease:       "easeInOut",
              repeat:     Infinity,
              repeatType: "mirror",
              delay:      2.5,
            }}
          />

          {/* Blob 3 — sky/cyan accent, centre-right */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width:      340,
              height:     340,
              background: "radial-gradient(circle, rgba(14,165,233,0.20) 0%, transparent 65%)",
              filter:     "blur(58px)",
              top:        "38%",
              left:       "56%",
            }}
            animate={{
              x: [0, -45,  28, -14,   0],
              y: [0,  35, -50,  18,   0],
            }}
            transition={{
              duration:   11,
              ease:       "easeInOut",
              repeat:     Infinity,
              repeatType: "mirror",
              delay:      1,
            }}
          />

          {/* Blob 4 — pale blue, top-right (adds depth) */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            style={{
              width:      280,
              height:     280,
              background: "radial-gradient(circle, rgba(96,165,250,0.13) 0%, transparent 65%)",
              filter:     "blur(52px)",
              top:        "6%",
              right:      "12%",
            }}
            animate={{
              x: [0,  35, -22,   0],
              y: [0,  45, -12,   0],
            }}
            transition={{
              duration:   13,
              ease:       "easeInOut",
              repeat:     Infinity,
              repeatType: "mirror",
              delay:      3.5,
            }}
          />

          {/* ── Foreground text ───────────────────────────────────────────── */}
          <div className="relative z-10 text-center select-none px-8 -mt-16">

            {/* "Welcome," */}
            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut", delay: 0.15 }}
              className="text-sm font-inter font-medium uppercase tracking-[0.3em] mb-5"
              style={{ color: "rgba(147,197,253,0.6)" }}
            >
              Welcome{name ? "," : ""}
            </motion.p>

            {/* Name — letter by letter cascade */}
            {name ? (
              <motion.div
                key={name}          // restart animation if name arrives late
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: {
                    transition: {
                      staggerChildren: 0.055,
                      delayChildren:   0.48,
                    },
                  },
                }}
                className="flex items-end justify-center flex-wrap gap-x-0"
                aria-label={name}
              >
                {letters.map((char, i) => (
                  <motion.span
                    key={i}
                    variants={{
                      hidden: {
                        opacity: 0,
                        y:       32,
                        filter:  "blur(6px)",
                      },
                      show: {
                        opacity:    1,
                        y:          0,
                        filter:     "blur(0px)",
                        transition: {
                          duration: 0.48,
                          ease:     letterEase,
                        },
                      },
                    }}
                    className="font-sora font-bold text-white leading-none inline-block"
                    style={{
                      fontSize:    "clamp(52px, 12vw, 88px)",
                      textShadow:  "0 0 40px rgba(59,130,246,0.55), 0 0 80px rgba(59,130,246,0.22)",
                      marginRight: char === " " ? "0.18em" : undefined,
                    }}
                  >
                    {char === " " ? "\u00A0" : char}
                  </motion.span>
                ))}
              </motion.div>
            ) : (
              /* Name not loaded yet — pulsing placeholder */
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="flex items-center justify-center"
                style={{ height: "clamp(60px, 12vw, 96px)" }}
              >
                <div
                  className="rounded-2xl animate-pulse"
                  style={{
                    width:           192,
                    height:          52,
                    backgroundColor: "rgba(59,130,246,0.10)",
                    border:          "1px solid rgba(59,130,246,0.12)",
                  }}
                />
              </motion.div>
            )}

            {/* Sub-line */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, ease: "easeOut", delay: subDelay }}
              className="mt-8 text-[11px] font-inter tracking-[0.28em] uppercase"
              style={{ color: "rgba(147,197,253,0.32)" }}
            >
              Your journal is ready
            </motion.p>
          </div>

          {/* ── Skip hint ─────────────────────────────────────────────────── */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            transition={{ delay: 1.5, duration: 0.5 }}
            className="absolute bottom-10 text-[10px] font-inter tracking-[0.22em] uppercase"
            style={{ color: "rgba(147,197,253,0.5)" }}
          >
            tap to continue
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
