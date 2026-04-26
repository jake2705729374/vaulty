/**
 * lib/email.ts — Resend email utility (server-side only).
 *
 * Configure via .env:
 *   RESEND_API_KEY   Your Resend API key (starts with re_...)
 *   RESEND_FROM      Verified sender address.
 *                    Add your domain at resend.com/domains, then use:
 *                    Vaultly <hello@yourdomain.com>
 */

import { Resend } from "resend"

function getClient(): Resend {
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error("RESEND_API_KEY is not set in .env")
  return new Resend(key)
}

const FROM = () => process.env.RESEND_FROM ?? "Vaultly <onboarding@resend.dev>"

async function send(payload: Parameters<Resend["emails"]["send"]>[0]) {
  const resend = getClient()
  const { data, error } = await resend.emails.send(payload)
  if (error) throw new Error(`Resend error: ${error.message}`)
  return data
}

// ── Shared HTML wrapper ───────────────────────────────────────────────────────
function emailShell(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f9fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:480px;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;overflow:hidden;">
        ${body}
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Verification email ────────────────────────────────────────────────────────
export async function sendVerificationEmail(to: string, code: string): Promise<void> {
  await send({
    from:    FROM(),
    to:      [to],
    subject: "Your Vaultly verification code",
    text: [
      `Your 6-digit verification code is: ${code}`,
      "",
      "This code expires in 15 minutes.",
      "",
      "If you didn't create a Vaultly account, you can safely ignore this email.",
    ].join("\n"),
    html: emailShell(`
      <tr><td style="padding:32px 32px 0;text-align:center;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:linear-gradient(135deg,#2563EB,#1D4ED8);border-radius:14px;margin-bottom:16px;">
          <span style="color:#fff;font-size:22px;font-weight:800;font-family:Georgia,serif;">V</span>
        </div>
        <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Confirm your email</h1>
        <p style="margin:0;font-size:14px;color:#6b7280;">Enter this code in the app to activate your vault.</p>
      </td></tr>

      <tr><td style="padding:28px 32px;text-align:center;">
        <div style="display:inline-block;background:#f3f4f6;border-radius:12px;padding:20px 40px;">
          <span style="font-size:38px;font-weight:800;letter-spacing:10px;color:#111827;font-family:monospace;">${code}</span>
        </div>
        <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">Expires in <strong>15 minutes</strong></p>
      </td></tr>

      <tr><td style="padding:0 32px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#d1d5db;">
          If you didn't sign up for Vaultly, you can safely ignore this email.
        </p>
      </td></tr>
    `),
  })
}

// ── Weekly digest email ───────────────────────────────────────────────────────
export async function sendWeeklyDigest({
  to, name, digest, entryCount,
}: {
  to: string
  name: string
  digest: string
  entryCount: number
}): Promise<void> {
  const entryLabel = entryCount === 1 ? "1 entry" : `${entryCount} entries`

  await send({
    from:    FROM(),
    to:      [to],
    subject: `Your week in Vaultly`,
    text: [
      `Hi ${name},`,
      "",
      `Here's a reflection on your week — you wrote ${entryLabel}.`,
      "",
      digest,
      "",
      "Keep writing. Your vault is waiting.",
      "— Your Vaultly Coach",
    ].join("\n"),
    html: emailShell(`
      <tr><td style="padding:32px 32px 0;text-align:center;">
        <div style="display:inline-flex;align-items:center;justify-content:center;width:48px;height:48px;background:linear-gradient(135deg,#2563EB,#1D4ED8);border-radius:14px;margin-bottom:16px;">
          <span style="color:#fff;font-size:22px;font-weight:800;font-family:Georgia,serif;">V</span>
        </div>
        <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#111827;">Your week in Vaultly</h1>
        <p style="margin:0;font-size:13px;color:#9ca3af;">${entryLabel} this week</p>
      </td></tr>

      <tr><td style="padding:24px 32px;">
        <div style="background:#f9fafb;border-radius:12px;padding:20px 22px;border-left:3px solid #2563EB;">
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${digest.replace(/\n/g, "<br>")}</p>
        </div>
      </td></tr>

      <tr><td style="padding:0 32px 32px;text-align:center;">
        <a href="${process.env.NEXTAUTH_URL ?? "https://vaultly.app"}/journal"
           style="display:inline-block;background:linear-gradient(135deg,#2563EB,#1D4ED8);color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;margin-bottom:16px;">
          Open your journal →
        </a>
        <p style="margin:0;font-size:11px;color:#d1d5db;">
          You're receiving this because you enabled weekly digests in Vaultly settings.
        </p>
      </td></tr>
    `),
  })
}

// ── Password reset email ──────────────────────────────────────────────────────
export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  await send({
    from:    FROM(),
    to:      [to],
    subject: "Your password reset code",
    text: [
      `Your 6-digit password reset code is: ${code}`,
      "",
      "This code expires in 15 minutes.",
      "",
      "⚠️  Important: resetting your password will permanently lock your existing",
      "encrypted journal entries. They cannot be recovered after this reset.",
      "",
      "If you did not request a password reset, you can safely ignore this email.",
    ].join("\n"),
    html: emailShell(`
      <tr><td style="padding:32px 32px 0;text-align:center;">
        <div style="font-size:32px;margin-bottom:12px;">🔐</div>
        <h1 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#111827;">Password reset code</h1>
        <p style="margin:0;font-size:14px;color:#6b7280;">Enter this code in the app to reset your password.</p>
      </td></tr>

      <tr><td style="padding:28px 32px;text-align:center;">
        <div style="display:inline-block;background:#f3f4f6;border-radius:12px;padding:20px 32px;">
          <span style="font-size:36px;font-weight:800;letter-spacing:8px;color:#111827;font-family:monospace;">${code}</span>
        </div>
        <p style="margin:16px 0 0;font-size:13px;color:#9ca3af;">Expires in <strong>15 minutes</strong></p>
      </td></tr>

      <tr><td style="padding:0 32px 24px;">
        <div style="background:#fef9c3;border:1px solid #fde047;border-radius:10px;padding:14px 16px;">
          <p style="margin:0;font-size:13px;color:#854d0e;line-height:1.5;">
            <strong>⚠️ Heads up:</strong> Resetting your password will permanently lock your existing
            encrypted journal entries. This is by design — we never have access to your encryption key.
          </p>
        </div>
      </td></tr>

      <tr><td style="padding:0 32px 32px;text-align:center;">
        <p style="margin:0;font-size:12px;color:#d1d5db;">
          If you didn't request this, you can safely ignore this email.
        </p>
      </td></tr>
    `),
  })
}
