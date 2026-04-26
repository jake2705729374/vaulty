"use client"

import { motion } from "framer-motion"

/**
 * Wraps a page in a subtle fade-up entrance animation.
 * Apply to every page that doesn't already have its own framer-motion wrapper.
 * The body carries `bg-page` via globals.css so the opacity fade never
 * reveals a different background color underneath.
 */
export default function PageTransition({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  )
}
