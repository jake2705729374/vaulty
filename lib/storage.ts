/**
 * lib/storage.ts
 *
 * Supabase Storage helper for entry media (photos & videos).
 *
 * Uses the Supabase Storage REST API directly — no extra SDK dependency.
 *
 * Bucket: "entry-media" (must exist in your Supabase project)
 *   Dashboard → Storage → New bucket → name: entry-media → Public: YES
 *   (Public means CDN URLs work without a signed token.  All paths include the
 *    user's ID so they are not guessable even though the bucket is public.)
 *
 * Required env vars (add to .env and Vercel project settings):
 *   SUPABASE_URL              = https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY = <service_role secret from Supabase → Settings → API>
 */

const BUCKET = "entry-media"

function baseUrl() {
  const url = process.env.SUPABASE_URL
  if (!url) throw new Error("SUPABASE_URL is not set")
  return url.replace(/\/$/, "") // strip trailing slash
}

function serviceKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set")
  return key
}

/**
 * Upload a file to Supabase Storage.
 *
 * Storage path: `{userId}/{mediaId}-{sanitisedFileName}`
 * Returns the public CDN URL for the uploaded object.
 */
export async function uploadMedia(
  fileBuffer: ArrayBuffer,
  mimeType:   string,
  fileName:   string,
  userId:     string,
  mediaId:    string,
): Promise<string> {
  // Sanitise the original filename so it is URL-safe
  const safeName  = fileName.replace(/[^a-zA-Z0-9._-]/g, "_")
  const storagePath = `${userId}/${mediaId}-${safeName}`

  const uploadUrl = `${baseUrl()}/storage/v1/object/${BUCKET}/${storagePath}`

  const res = await fetch(uploadUrl, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${serviceKey()}`,
      "Content-Type":  mimeType,
      "x-upsert":      "false",  // fail if the object already exists
    },
    // Wrap in Blob so the body type is unambiguous across Node/DOM type defs.
    // Blob is the only BodyInit type that's accepted by all TypeScript lib variants.
    body: new Blob([fileBuffer], { type: mimeType }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`Supabase Storage upload failed (${res.status}): ${body}`)
  }

  // Public CDN URL — no token needed for public buckets
  return `${baseUrl()}/storage/v1/object/public/${BUCKET}/${storagePath}`
}

/**
 * Delete a media object from Supabase Storage.
 *
 * Accepts the full public URL that was stored in EntryMedia.storageUrl.
 * Silently succeeds if the object was already deleted (404 from storage).
 */
export async function deleteMedia(storageUrl: string): Promise<void> {
  // Extract the object path from the full public URL
  // URL format: {base}/storage/v1/object/public/{bucket}/{path}
  const marker = `/storage/v1/object/public/${BUCKET}/`
  const idx    = storageUrl.indexOf(marker)
  if (idx === -1) {
    // Not a Supabase Storage URL we recognise — skip silently
    return
  }

  const objectPath = storageUrl.slice(idx + marker.length)
  const deleteUrl  = `${baseUrl()}/storage/v1/object/${BUCKET}`

  const res = await fetch(deleteUrl, {
    method:  "DELETE",
    headers: {
      "Authorization": `Bearer ${serviceKey()}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ prefixes: [objectPath] }),
  })

  // 404 means already deleted — treat as success
  if (!res.ok && res.status !== 404) {
    const body = await res.text().catch(() => "")
    throw new Error(`Supabase Storage delete failed (${res.status}): ${body}`)
  }
}
