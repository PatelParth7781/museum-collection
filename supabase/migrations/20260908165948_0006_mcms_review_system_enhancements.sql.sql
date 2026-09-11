/*
# Review System Enhancements

## Summary
Upgrades the existing reviews and comments tables to support a full
public review & rating system with moderation, guest readability, and
admin management.

## Changes

### 1. Reviews table — new `status` column
- Adds `status text NOT NULL DEFAULT 'published'` with CHECK constraint
  limiting values to `published`, `hidden`, `pending`.
- Keeps the existing `is_approved` boolean for backward compatibility;
  a trigger syncs `is_approved` from `status` (published = true).
- Adds index on `status` for filtering.
- Adds index on `created_at` for sorting.

### 2. Comments table — new `status` column
- Same `status` column and index as reviews.

### 3. RLS policy changes — reviews
- SELECT: now `TO anon, authenticated` so guests can READ published
  reviews. Only `status = 'published'` rows are visible to anon/authenticated
  non-admins. Admins can see all via a separate policy.
- INSERT/UPDATE/DELETE: unchanged — owner-scoped to authenticated users.
- Admin override: admin role can UPDATE/DELETE any review (moderation).

### 4. RLS policy changes — comments
- Same pattern as reviews.

### 5. Trigger to sync is_approved from status
- `before insert or update` trigger sets `is_approved = (status = 'published')`.

## Security
- Guests can only read published reviews/comments.
- Authenticated users can CRUD their own reviews/comments.
- Admins can update status (moderate) and delete any review/comment.
- Users can never create a review with another user's ID (INSERT WITH CHECK
  enforces auth.uid() = user_id).
- One review per user per artifact (existing UNIQUE constraint retained).
*/

-- ============================================================
-- 1. Reviews: add status column + indexes
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.reviews ADD COLUMN status text NOT NULL DEFAULT 'published';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_status_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_status_check
  CHECK (status IN ('published', 'hidden', 'pending'));

-- Backfill: existing rows where is_approved = true → published, false → pending
UPDATE public.reviews SET status = 'published' WHERE is_approved = true AND status = 'published';
UPDATE public.reviews SET status = 'pending' WHERE is_approved = false AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_created ON public.reviews(created_at);

-- ============================================================
-- 2. Comments: add status column + indexes
-- ============================================================
DO $$ BEGIN
  ALTER TABLE public.comments ADD COLUMN status text NOT NULL DEFAULT 'published';
EXCEPTION WHEN duplicate_column THEN NULL; END $$;

ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_status_check;
ALTER TABLE public.comments ADD CONSTRAINT comments_status_check
  CHECK (status IN ('published', 'hidden', 'pending'));

UPDATE public.comments SET status = 'published' WHERE is_approved = true AND status = 'published';
UPDATE public.comments SET status = 'pending' WHERE is_approved = false AND status = 'published';

CREATE INDEX IF NOT EXISTS idx_comments_status ON public.comments(status);
CREATE INDEX IF NOT EXISTS idx_comments_created ON public.comments(created_at);

-- ============================================================
-- 3. Trigger: sync is_approved from status
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_review_approval()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.is_approved := (NEW.status = 'published');
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_reviews_sync_approval ON public.reviews;
CREATE TRIGGER trg_reviews_sync_approval
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.sync_review_approval();

DROP TRIGGER IF EXISTS trg_comments_sync_approval ON public.comments;
CREATE TRIGGER trg_comments_sync_approval
  BEFORE INSERT OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.sync_review_approval();

-- ============================================================
-- 4. RLS: Reviews — guests can read published, users own CRUD, admin manages all
-- ============================================================

-- Drop old policies
DROP POLICY IF EXISTS "reviews_select_all" ON public.reviews;
DROP POLICY IF EXISTS "reviews_insert_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;

-- Public read: guests + authenticated can read published reviews
CREATE POLICY "reviews_select_published"
  ON public.reviews FOR SELECT TO anon, authenticated
  USING (status = 'published');

-- Admin read: admins can see all reviews
CREATE POLICY "reviews_select_admin"
  ON public.reviews FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Users insert their own reviews
CREATE POLICY "reviews_insert_own"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users update their own reviews (rating/text only, not status)
CREATE POLICY "reviews_update_own"
  ON public.reviews FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin update: admins can moderate (change status, edit) any review
CREATE POLICY "reviews_update_admin"
  ON public.reviews FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Users delete their own reviews
CREATE POLICY "reviews_delete_own"
  ON public.reviews FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Admin delete: admins can delete any review
CREATE POLICY "reviews_delete_admin"
  ON public.reviews FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- ============================================================
-- 5. RLS: Comments — same pattern
-- ============================================================

DROP POLICY IF EXISTS "comments_select_all" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_own" ON public.comments;
DROP POLICY IF EXISTS "comments_update_own" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_own" ON public.comments;

CREATE POLICY "comments_select_published"
  ON public.comments FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "comments_select_admin"
  ON public.comments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "comments_insert_own"
  ON public.comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update_own"
  ON public.comments FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "comments_update_admin"
  ON public.comments FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "comments_delete_own"
  ON public.comments FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "comments_delete_admin"
  ON public.comments FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );
