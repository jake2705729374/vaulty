"use client"

/**
 * app/(pages)/terms/page.tsx — Terms of Service
 *
 * Matches the landing-page design system exactly:
 *   • #0A0A0F background, Sora headings, Inter body
 *   • LandingNav + LandingFooter
 *   • Framer-motion entrance animations
 *   • Gradient orb background
 *
 * Last updated: April 30, 2026
 */

import Link from "next/link"
import { motion, type Variants } from "framer-motion"
import LandingNav    from "@/components/landing/LandingNav"
import LandingFooter from "@/components/landing/LandingFooter"

// ── Shared animation variants ─────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 22 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] } },
}
const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }

// ── Section anchor IDs ────────────────────────────────────────────────────────
const sections = [
  { id: "acceptance",     label: "Acceptance" },
  { id: "service",        label: "Description of Service" },
  { id: "account",        label: "Your Account" },
  { id: "content",        label: "Your Content" },
  { id: "encryption",     label: "Encryption Responsibility" },
  { id: "ai",             label: "AI Features" },
  { id: "acceptable-use", label: "Acceptable Use" },
  { id: "privacy",        label: "Privacy" },
  { id: "ip",             label: "Intellectual Property" },
  { id: "disclaimers",    label: "Disclaimers" },
  { id: "liability",      label: "Limitation of Liability" },
  { id: "termination",    label: "Termination" },
  { id: "changes",        label: "Changes to Terms" },
  { id: "contact",        label: "Contact" },
]

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ n, id, children }: { n: string; id: string; children: React.ReactNode }) {
  return (
    <div id={id} className="flex items-start gap-4 mb-5 pt-12 scroll-mt-28">
      <span
        className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-inter"
        style={{ background: "rgba(37,99,235,0.12)", color: "#2563EB", border: "1px solid rgba(37,99,235,0.25)" }}
      >
        {n}
      </span>
      <h2
        className="text-xl font-bold font-sora tracking-tight"
        style={{ color: "#F0F0F0" }}
      >
        {children}
      </h2>
    </div>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed mb-4 font-inter" style={{ color: "#8B8BA7" }}>
      {children}
    </p>
  )
}

function Ul({ children }: { children: React.ReactNode }) {
  return (
    <ul className="space-y-2 mb-4 pl-1">
      {children}
    </ul>
  )
}

function Li({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm font-inter" style={{ color: "#8B8BA7" }}>
      <span className="mt-1.5 flex-shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "#2563EB" }} />
      <span>{children}</span>
    </li>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <strong style={{ color: "#D4D4F0", fontWeight: 600 }}>{children}</strong>
}

function Callout({ variant, children }: { variant: "warning" | "info" | "legal"; children: React.ReactNode }) {
  const styles = {
    warning: {
      bg:     "rgba(239,68,68,0.07)",
      border: "1px solid rgba(239,68,68,0.22)",
      color:  "#FCA5A5",
      icon:   "⚠️",
    },
    info: {
      bg:     "rgba(37,99,235,0.07)",
      border: "1px solid rgba(37,99,235,0.22)",
      color:  "#93B4FF",
      icon:   "ℹ️",
    },
    legal: {
      bg:     "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.10)",
      color:  "#8B8BA7",
      icon:   "§",
    },
  }
  const s = styles[variant]
  return (
    <div
      className="rounded-xl p-4 mb-6 flex gap-3"
      style={{ background: s.bg, border: s.border }}
    >
      <span className="text-base mt-0.5 flex-shrink-0 font-inter">{s.icon}</span>
      <div className="text-sm font-inter leading-relaxed" style={{ color: s.color }}>
        {children}
      </div>
    </div>
  )
}

function ExternalLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="transition-colors duration-150"
      style={{ color: "#2563EB" }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "#60A5FA")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "#2563EB")}
    >
      {children}
    </a>
  )
}

function AllCaps({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-semibold font-inter leading-relaxed mb-4 p-4 rounded-xl"
      style={{
        color: "#8B8BA7",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        letterSpacing: "0.01em",
      }}
    >
      {children}
    </p>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TermsPage() {
  return (
    <div style={{ background: "#0A0A0F", minHeight: "100vh" }}>
      <LandingNav />

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-16 px-4 overflow-hidden">

        {/* Gradient orb */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[480px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(37,99,235,0.18) 0%, rgba(37,99,235,0.06) 50%, transparent 70%)",
              filter: "blur(80px)",
            }}
          />
        </div>

        <motion.div
          className="relative z-10 max-w-3xl mx-auto text-center"
          initial="hidden"
          animate="show"
          variants={stagger}
        >
          {/* Badge */}
          <motion.div variants={fadeUp} className="mb-5 flex justify-center">
            <span
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold font-inter"
              style={{
                background: "rgba(37,99,235,0.10)",
                border: "1px solid rgba(37,99,235,0.28)",
                color: "#93B4FF",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2563EB" }} />
              Last updated: April 30, 2026
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl sm:text-5xl font-bold font-sora tracking-tight mb-4"
            style={{ color: "#F0F0F0" }}
          >
            Terms of Service
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-base font-inter leading-relaxed max-w-xl mx-auto"
            style={{ color: "#8B8BA7" }}
          >
            Please read these terms carefully before using Vaultly. They govern
            your use of the service, explain your rights and responsibilities, and
            contain important information about our AI features and encryption model.
          </motion.p>
        </motion.div>
      </section>

      {/* ── Jump links ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.5 }}
        className="max-w-3xl mx-auto px-4 mb-8"
      >
        <div
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-xs font-semibold font-inter uppercase tracking-widest mb-4" style={{ color: "#555570" }}>
            Contents
          </p>
          <div className="flex flex-wrap gap-2">
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-inter font-medium transition-all duration-150"
                style={{
                  background: "rgba(37,99,235,0.08)",
                  color: "#8B8BA7",
                  border: "1px solid rgba(37,99,235,0.15)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(37,99,235,0.15)"
                  e.currentTarget.style.color = "#93B4FF"
                  e.currentTarget.style.borderColor = "rgba(37,99,235,0.35)"
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(37,99,235,0.08)"
                  e.currentTarget.style.color = "#8B8BA7"
                  e.currentTarget.style.borderColor = "rgba(37,99,235,0.15)"
                }}
              >
                <span style={{ color: "#2563EB", fontWeight: 700 }}>{i + 1}.</span>
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Document body ── */}
      <motion.main
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.6 }}
        className="max-w-3xl mx-auto px-4 pb-24"
      >
        {/* Divider */}
        <div className="h-px mb-2" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

        {/* 1 — Acceptance */}
        <SectionHeading n="1" id="acceptance">Acceptance of Terms</SectionHeading>
        <P>
          By accessing or using Vaultly (the &quot;Service&quot;), you agree to be bound by these
          Terms of Service (&quot;Terms&quot;). If you do not agree to all of these Terms, you may
          not access or use the Service. These Terms form a legally binding agreement between you
          and the operator of Vaultly.
        </P>
        <P>
          We reserve the right to update these Terms at any time. Continued use of the Service
          after changes are posted constitutes acceptance of the revised Terms.
        </P>

        {/* 2 — Service */}
        <SectionHeading n="2" id="service">Description of Service</SectionHeading>
        <P>
          Vaultly is a private, AI-enhanced journaling application. The Service provides:
        </P>
        <Ul>
          <Li>Encrypted journal entry creation, editing, and storage</Li>
          <Li>Mood tracking and habit tracking features</Li>
          <Li>An AI Coach powered by Anthropic&apos;s Claude API for reflective support and journaling prompts</Li>
          <Li>An AI Therapist feature for in-entry reflection</Li>
          <Li>Optional weekly digest emails summarising your journaling activity</Li>
          <Li>Encrypted media attachments (images, audio) associated with entries</Li>
        </Ul>
        <P>
          The Service is provided &quot;as is&quot; and we may add, modify, or discontinue features
          at any time with reasonable notice.
        </P>

        {/* 3 — Account */}
        <SectionHeading n="3" id="account">Your Account</SectionHeading>
        <Ul>
          <Li>You must provide a valid email address to create an account</Li>
          <Li>You must be at least 13 years of age to use the Service</Li>
          <Li>You may only maintain one account per person</Li>
          <Li>
            You are solely responsible for maintaining the confidentiality of your password and
            for all activity that occurs under your account
          </Li>
          <Li>You must notify us immediately if you suspect unauthorized access to your account</Li>
          <Li>We reserve the right to suspend or terminate accounts that violate these Terms</Li>
        </Ul>

        {/* 4 — Content */}
        <SectionHeading n="4" id="content">Your Content</SectionHeading>
        <P>
          You retain full ownership of all journal entries, media, and other content you create
          in Vaultly (&quot;Your Content&quot;). We make no claim to any rights in Your Content.
        </P>
        <P>
          By using the Service, you grant us a limited, non-exclusive, royalty-free license to
          store, encrypt, back up, and transmit Your Content solely for the purpose of providing
          the Service to you. This license terminates when you delete the content or your account.
        </P>
        <P>
          You are solely responsible for the content you create. You represent that you have the
          right to create and store all content you submit and that such content does not violate
          any applicable law or these Terms.
        </P>

        {/* 5 — Encryption */}
        <SectionHeading n="5" id="encryption">Encryption Responsibility</SectionHeading>

        <Callout variant="warning">
          <strong>Your password is the key to your data.</strong> Vaultly encrypts your journal
          entries client-side using a key derived from your password. If you lose your password,
          your encrypted entries cannot be recovered — by you or by us. There is no backdoor.
        </Callout>

        <P>
          Specifically:
        </P>
        <Ul>
          <Li>
            A password reset allows you to log in again but does not decrypt previously written
            entries — those remain encrypted with the old key and are inaccessible without
            the original password
          </Li>
          <Li>
            We strongly recommend using a password manager and keeping a secure copy of your
            Vaultly password
          </Li>
          <Li>
            We are not liable for data loss caused by forgotten passwords or loss of access
            credentials
          </Li>
        </Ul>

        {/* 6 — AI Features */}
        <SectionHeading n="6" id="ai">AI Features</SectionHeading>

        <Callout variant="warning">
          <strong>
            The AI Coach and AI Therapist are not a substitute for professional mental health
            care, medical advice, crisis intervention, or therapy.
          </strong>{" "}
          If you are experiencing a mental health emergency or crisis, please contact a qualified
          mental health professional or call your local emergency services immediately.
        </Callout>

        <P>
          The AI features in Vaultly are provided for personal reflection, journaling prompts,
          and emotional support purposes only. AI-generated responses:
        </P>
        <Ul>
          <Li>May not always be accurate, appropriate, or suitable for your situation</Li>
          <Li>Should not be relied upon for medical, legal, financial, or crisis decisions</Li>
          <Li>Are generated by Anthropic&apos;s Claude AI and are subject to Anthropic&apos;s usage policies</Li>
          <Li>
            Are based on what you share in the conversation — the quality of responses depends
            on the information provided
          </Li>
        </Ul>
        <P>
          When you use AI features, relevant journal content is transmitted to Anthropic for
          processing. Please review Section 4 of our{" "}
          <Link
            href="/privacy#ai-disclosure"
            className="transition-colors duration-150"
            style={{ color: "#2563EB" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#60A5FA")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#2563EB")}
          >
            Privacy Policy
          </Link>{" "}
          for full disclosure of what data is shared with Anthropic and how to opt out.
        </P>

        {/* 7 — Acceptable Use */}
        <SectionHeading n="7" id="acceptable-use">Acceptable Use</SectionHeading>
        <P>You agree not to use Vaultly to:</P>
        <Ul>
          <Li>Store, transmit, or create illegal content of any kind</Li>
          <Li>Harass, abuse, or harm yourself or others</Li>
          <Li>Attempt to reverse-engineer, circumvent, or tamper with the encryption</Li>
          <Li>Share your account credentials with others</Li>
          <Li>Attempt to access, alter, or delete another user&apos;s data</Li>
          <Li>Use automated scripts or bots to interact with the Service</Li>
          <Li>Violate any applicable local, national, or international law or regulation</Li>
          <Li>Interfere with or disrupt the integrity or performance of the Service</Li>
        </Ul>

        {/* 8 — Privacy */}
        <SectionHeading n="8" id="privacy">Privacy</SectionHeading>
        <P>
          Your use of Vaultly is also governed by our{" "}
          <Link
            href="/privacy"
            className="transition-colors duration-150"
            style={{ color: "#2563EB" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#60A5FA")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#2563EB")}
          >
            Privacy Policy
          </Link>
          , which is incorporated into these Terms of Service by reference. The Privacy Policy
          describes what data we collect, how it is protected, the AI data-sharing disclosures
          required by GDPR and applicable law, and your rights over your data.
        </P>

        {/* 9 — IP */}
        <SectionHeading n="9" id="ip">Intellectual Property</SectionHeading>
        <P>
          The Vaultly name, logo, application code, and design are the intellectual property of
          the Service operator and are protected by applicable intellectual property laws.
          You may not copy, reproduce, modify, or distribute any part of the Service without
          explicit written permission.
        </P>
        <P>
          As stated in Section 4, you retain full ownership of Your Content.
        </P>

        {/* 10 — Disclaimers */}
        <SectionHeading n="10" id="disclaimers">Disclaimer of Warranties</SectionHeading>
        <AllCaps>
          VAULTLY IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTY
          OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, WE EXPRESSLY DISCLAIM
          ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
          MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, AND ANY WARRANTIES
          ARISING FROM COURSE OF DEALING OR COURSE OF PERFORMANCE. WE DO NOT WARRANT THAT THE
          SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS.
        </AllCaps>
        <P>
          We make no warranty that Vaultly will meet your specific requirements, or that any
          errors in the Service will be corrected. Use of the Service is at your own risk.
        </P>

        {/* 11 — Liability */}
        <SectionHeading n="11" id="liability">Limitation of Liability</SectionHeading>
        <AllCaps>
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE OPERATOR OF VAULTLY SHALL NOT
          BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE
          DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER
          INTANGIBLE LOSSES, ARISING FROM OR RELATING TO YOUR USE OF OR INABILITY TO USE THE
          SERVICE, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
        </AllCaps>
        <P>
          This includes but is not limited to loss of journal data due to forgotten passwords,
          service outages, data corruption, or any other cause beyond our reasonable control.
        </P>

        {/* 12 — Termination */}
        <SectionHeading n="12" id="termination">Termination</SectionHeading>
        <P>
          <Strong>You</Strong> may delete your account at any time in Settings → Delete Account.
          This permanently and irrevocably deletes all your data from our systems.
        </P>
        <P>
          <Strong>We</Strong> reserve the right to suspend or terminate your access to the
          Service at any time, with or without notice, for violation of these Terms, for conduct
          that we determine is harmful to other users or the Service, or for any other reason
          at our sole discretion. We will make reasonable efforts to notify you before
          termination unless prohibited by law or to protect the safety of the Service.
        </P>

        {/* 13 — Changes */}
        <SectionHeading n="13" id="changes">Changes to These Terms</SectionHeading>
        <P>
          We may revise these Terms from time to time. We will notify you of material changes
          by email and by posting a prominent notice in the application. The revised Terms will
          be effective from the date of posting. Your continued use of Vaultly after that date
          constitutes your agreement to the revised Terms.
        </P>
        <P>
          If you do not agree to any revised Terms, you must stop using the Service and may
          delete your account at any time.
        </P>

        {/* 14 — Contact */}
        <SectionHeading n="14" id="contact">Contact</SectionHeading>
        <P>
          If you have questions about these Terms of Service, please contact us at{" "}
          <ExternalLink href="mailto:legal@vaultly.app">legal@vaultly.app</ExternalLink>.
          We aim to respond to all inquiries within 5 business days.
        </P>

        {/* ── Divider ── */}
        <div className="h-px my-12" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

        {/* ── Bottom CTA ── */}
        <div
          className="rounded-2xl p-8 text-center"
          style={{ background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.15)" }}
        >
          <p className="text-sm font-inter mb-1" style={{ color: "#555570" }}>Read our other legal documents</p>
          <h3 className="text-lg font-bold font-sora mb-6" style={{ color: "#F0F0F0" }}>
            Questions about how we protect your data?
          </h3>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/privacy"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold font-inter transition-all duration-200"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#F0F0F0" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.10)"
                e.currentTarget.style.transform = "translateY(-1px)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)"
                e.currentTarget.style.transform = "translateY(0)"
              }}
            >
              Privacy Policy →
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold font-inter transition-all duration-200"
              style={{
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                color: "#fff",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)"
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(37,99,235,0.4)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)"
                e.currentTarget.style.boxShadow = "none"
              }}
            >
              Start writing for free →
            </Link>
          </div>
        </div>
      </motion.main>

      <LandingFooter />
    </div>
  )
}
