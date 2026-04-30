-- Migrate EntryMedia from raw BYTEA storage to object-storage URLs.
--
-- Before: "data" column holds raw binary (Bytes / bytea) — bloats the DB
-- After:  "storageUrl" column holds a CDN URL from Supabase Storage
--
-- Existing rows (if any) will have storageUrl = NULL after this migration.
-- They will simply not render in the UI — users can re-upload if needed.

-- AlterTable
ALTER TABLE "EntryMedia" DROP COLUMN IF EXISTS "data";
ALTER TABLE "EntryMedia" ADD COLUMN "storageUrl" TEXT;
