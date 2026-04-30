-- Add mediaIv column to EntryMedia for client-side AES-256-GCM encryption.
-- Existing rows get mediaIv = NULL, meaning they are legacy unencrypted files.
-- New uploads will always have mediaIv set (base64 AES-GCM IV).
ALTER TABLE "EntryMedia" ADD COLUMN IF NOT EXISTS "mediaIv" TEXT;
