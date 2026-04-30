/**
 * lib/storage.ts
 *
 * Supabase Storage helper for entry media (photos & videos).
 *
 * Uses the Supabase Storage REST API directly — no extra SDK dependency.
 *
 * Bucket: "entry-media" — must be set to PRIVATE in Supabase Dashboard.
 *   Dashboard → Storage → entry-media → bucket settings → make PRIVATE
 *   (Files are AES-256-GCM encrypted client-side before upload, so even if
 *    someone accessed the bucket directly they would only see ciphertext.
 *    Private + signed URLs gives a second access-control layer on top.)
 *
 * Storage paths: "{userId}/{mediaId}-{sanitisedFileName}"
 * The DB column EntryMedia.storageUrl stores this bare path (not a full URL).
 * Use getSignedUrls() to generate short-lived fetch URLs for the client.
 *
 * Required env vars:
 *   SUPABASE_URL              = https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = service_role secret from Supabase → Settings → API
 */

const BUCKET = "entry-media"
// Signed URLs expire after 1 hour — long enough for any editing session.
const SIGNED_URL_TTL = 3600

function baseUrl() {
  const url = process.env.SUPABASE_URL
  if (!url) throw new Error("SUPABASE_URL is not set")
  return url.replace(/\/$/, "")
}

function serviceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return key
}

/**
 * Extract the bare storage path from either format:
 *   • Legacy full CDN URL: "https://xxx.supabase.co/storage/v1/object/public/entry-media/{path}"
 *   • New bare path: "{userId}/{mediaId}-{name}"
 */
export function extractStoragePath(storageUrl: string): string {
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx = storageUrl.indexOf(marker)
  if (idx !== -1) return storageUrl.slice(idx + marker.length)
  return storageUrl  // already a bare path
}

/**
 * Upload an (encrypted) file to Supabase Storage.
 *
 * Accepts raw bytes (ArrayBuffer) — the caller is responsible for encrypting
 * before passing here.  Content-Type is always "application/octet-stream"
 * because the bytes are ciphertext, not a real image/video.
 *
 * Returns the bare storage path "{userId}/{mediaId}-{name}" (not a full URL).
 * Store this in EntryMedia.storageUrl and use getSignedUrls() to serve it.
 */
export async function uploadMedia(
  fileBuffer: ArrayBuffer,
  fileName:   string,
  userId:     string,
  mediaId:    string,
): Promise<string> {
  const safeName    = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const storagePath = `${userId}/${mediaId}-${safeName}`
  const uploadUrl   = `${baseUrl()}/storage/v1/object/${BUCKET}/${storagePath}`

  const res = await fetch(uploadUrl, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey()}`,
      "Content-Type":  "application/octet-stream",
      "x-upsert":      "false",
    },
    body: new Blob([fileBuffer], { type: "application/octet-stream" }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Supabase Storage upload failed (${res.status}): ${body}`)
  }

  return storagePath
}

/**
 * Generate signed fetch URLs for one or more storage paths.
 *
 * Uses individual per-object signed URL endpoints in parallel to avoid
 * authentication issues with the batch endpoint.
 *
 * Input:  array of bare storage paths ("{userId}/{mediaId}-{name}") OR legacy
 *         full CDN URLs (extractStoragePath handles both transparently).
 * Output: Record<originalStorageUrl, signedUrl> — failed paths are omitted.
 *
 * Signed URLs expire in SIGNED_URL_TTL seconds (1 hour).
 * The client uses these directly as fetch targets, then decrypts in-browser.
 */
export async function getSignedUrls(
  storageUrls: string[],
  expiresIn = SIGNED_URL_TTL,
): Promise<Record<string, string>> {
  if (storageUrls.length === 0) return {}

  const entries = await Promise.all(
    storageUrls.map(async (storageUrl) => {
      const path = extractStoragePath(storageUrl)

      try {
        const res = await fetch(
          `${baseUrl()}/storage/v1/object/sign/${BUCKET}/${path}`,
          {
            method:  "POST",
            headers: {
              "Authorization": `Bearer ${serviceKey()}`,
              "Content-Type":  "application/json",
            },
            body: JSON.stringify({ expiresIn }),
          },
        )

        if (!res.ok) {
          const body = await res.text().catch(() => "")
          console.error(`[storage] sign failed for "${path}": ${res.status} ${body}`)
          return [storageUrl, null] as const
        }

        const data = await res.json() as { signedURL?: string }
        if (!data.signedURL) {
          console.error(`[storage] no signedURL returned for "${path}"`, data)
          return [storageUrl, null] as const
        }

        return [storageUrl, `${baseUrl()}${data.signedURL}`] as const
      } catch (err) {
        console.error(`[storage] sign error for "${path}":`, err)
        return [storageUrl, null] as const
      }
    }),
  )

  return Object.fromEntries(
    entries.filter((entry): entry is [string, string] => entry[1] !== null),
  )
}

/**
 * Download a media object from Supabase Storage.
 *
 * Fetches the raw (encrypted) bytes directly using the service role key.
 * Used by the server-side proxy download endpoint so the client never needs
 * a signed URL — authentication is handled by NextAuth on our own API.
 *
 * Accepts either a bare storage path or a legacy full CDN URL.
 */
export async function downloadMedia(storageUrl: string): Promise<ArrayBuffer> {
  const path    = extractStoragePath(storageUrl)
  const fetchUrl = `${baseUrl()}/storage/v1/object/${BUCKET}/${path}`

  const res = await fetch(fetchUrl, {
    headers: {
      "Authorization": `Bearer ${serviceKey()}`,
    },
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Supabase Storage download failed (${res.status}): ${body}`)
  }

  return res.arrayBuffer()
}

/**
 * Delete a media object from Supabase Storage.
 *
 * Accepts either a bare storage path or a legacy full CDN URL.
 * Silently succeeds if the object was already deleted (404).
 */
export async function deleteMedia(storageUrl: string): Promise<void> {
  const objectPath = extractStoragePath(storageUrl)
  const deleteUrl  = `${baseUrl()}/storage/v1/object/${BUCKET}`

  const res = await fetch(deleteUrl, {
    method:  "DELETE",
    headers: {
      "Authorization": `Bearer ${serviceKey()}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ prefixes: [objectPath] }),
  })

  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => "")
    throw new Error(`Supabase Storage delete failed (${res.status}): ${body}`)
  }
}
