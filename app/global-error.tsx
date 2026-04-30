"use client"

/**
 * app/global-error.tsx — Root-level error boundary.
 *
 * Rendered when an error is thrown inside the root layout itself (layout.tsx).
 * Because it replaces the entire document, it MUST provide its own <html> and
 * <body> tags and cannot rely on the ThemeProvider or any CSS variables.
 *
 * Uses VAULT theme colors hardcoded since the normal CSS pipeline is bypassed.
 */
import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

interface GlobalErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Report root-layout crashes to Sentry — these are the most severe errors
    Sentry.captureException(error)
    if (process.env.NODE_ENV !== "production") {
      console.error("[Global Error]", error)
    }
  }, [error])

  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Something went wrong — Vaultly</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body {
            background: #0A0A0F;
            color: #f0f0f0;
            font-family: 'Sora', system-ui, -apple-system, sans-serif;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .container {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 4rem 1.5rem;
            max-width: 480px;
          }
          .icon-wrap {
            margin-bottom: 2rem;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 9999px;
            padding: 1.25rem;
            background: #1a1a26;
            border: 1px solid #272736;
          }
          h1 {
            font-size: 1.875rem;
            font-weight: 700;
            letter-spacing: -0.02em;
            margin-bottom: 0.75rem;
            color: #f0f0f0;
          }
          p.body {
            font-size: 1rem;
            line-height: 1.625;
            color: #8b8ba7;
            max-width: 22rem;
            margin-bottom: 0.5rem;
          }
          p.sub {
            font-size: 0.875rem;
            color: #555570;
            margin-bottom: 2.5rem;
          }
          .actions {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            width: 100%;
            max-width: 280px;
          }
          @media (min-width: 640px) {
            .actions { flex-direction: row; }
          }
          .btn-primary {
            flex: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.5rem;
            padding: 0.625rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 600;
            background: #2563EB;
            color: #ffffff;
            border: none;
            cursor: pointer;
            text-decoration: none;
            transition: background 0.15s;
          }
          .btn-primary:hover { background: #3b82f6; }
          .btn-secondary {
            flex: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 0.5rem;
            padding: 0.625rem 1.5rem;
            font-size: 0.875rem;
            font-weight: 500;
            background: #1a1a26;
            color: #f0f0f0;
            border: 1px solid #272736;
            cursor: pointer;
            transition: background 0.15s;
          }
          .btn-secondary:hover { background: #272736; }
          .footer {
            margin-top: 4rem;
            font-size: 0.75rem;
            color: #555570;
          }
        `}</style>
      </head>
      <body>
        <div className="container">
          {/* Lock icon */}
          <div className="icon-wrap">
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#2563EB"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              <circle cx="12" cy="16" r="1" fill="#2563EB" stroke="none" />
            </svg>
          </div>

          <h1>Something went wrong</h1>

          <p className="body">
            A critical error occurred. Your journal entries are encrypted and
            completely unaffected.
          </p>
          <p className="sub">Please try again in a moment.</p>

          <div className="actions">
            <button className="btn-primary" onClick={reset}>
              Try again
            </button>
            {/* global-error renders outside Next.js context — <Link> is unavailable */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="btn-secondary" href="/">
              Return home
            </a>
          </div>

          <p className="footer">Vaultly · Your data is always encrypted</p>
        </div>
      </body>
    </html>
  )
}
