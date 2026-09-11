-- MCMS Engagement & Cart System
-- Adds reviews, comments, category_likes, carts, and cart_items tables

-- ============================================================
-- REVIEWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_review_per_user_artifact UNIQUE (user_id, artifact_id)
);
CREATE INDEX IF NOT EXISTS idx_reviews_artifact ON public.reviews(artifact_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user ON public.reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_approved ON public.reviews(is_approved);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_select_all" ON public.reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "reviews_insert_own" ON public.reviews FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_update_own" ON public.reviews FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reviews_delete_own" ON public.reviews FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  body text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comments_artifact ON public.comments(artifact_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_approved ON public.comments(is_approved);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comments_select_all" ON public.comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "comments_insert_own" ON public.comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_own" ON public.comments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own" ON public.comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- CATEGORY LIKES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.category_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT one_like_per_user_category UNIQUE (user_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_category_likes_category ON public.category_likes(category_id);
CREATE INDEX IF NOT EXISTS idx_category_likes_user ON public.category_likes(user_id);
ALTER TABLE public.category_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cat_likes_select_all" ON public.category_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat_likes_insert_own" ON public.category_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cat_likes_delete_own" ON public.category_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- CARTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'checked_out', 'abandoned')),
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_carts_user ON public.carts(user_id);
CREATE INDEX IF NOT EXISTS idx_carts_status ON public.carts(status);
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "carts_select_all_staff" ON public.carts FOR SELECT TO authenticated USING (true);
CREATE POLICY "carts_insert_own" ON public.carts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "carts_update_own" ON public.carts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "carts_delete_own" ON public.carts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============================================================
-- CART ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id uuid NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  notes text DEFAULT '',
  added_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_artifact ON public.cart_items(artifact_id);
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cart_items_select_all_staff" ON public.cart_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "cart_items_insert_own" ON public.cart_items FOR INSERT TO authenticated WITH CHECK (auth.uid() = added_by);
CREATE POLICY "cart_items_update_own" ON public.cart_items FOR UPDATE TO authenticated USING (auth.uid() = added_by) WITH CHECK (auth.uid() = added_by);
CREATE POLICY "cart_items_delete_own" ON public.cart_items FOR DELETE TO authenticated USING (auth.uid() = added_by);

-- ============================================================
-- UPDATED_AT triggers (PostgreSQL has no IF NOT EXISTS for triggers)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_reviews_updated ON public.reviews;
CREATE TRIGGER trg_reviews_updated BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_comments_updated ON public.comments;
CREATE TRIGGER trg_comments_updated BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS trg_carts_updated ON public.carts;
CREATE TRIGGER trg_carts_updated BEFORE UPDATE ON public.carts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- SEED: Sample reviews, comments, and category likes
-- ============================================================
INSERT INTO public.reviews (user_id, artifact_id, rating, title, body, is_approved)
SELECT p.id, a.id, 5, 'Magnificent piece', 'This artifact beautifully represents the craftsmanship of its era. The detail is extraordinary.', true
FROM public.profiles p, public.artifacts a
WHERE p.role = 'visitor' AND a.accession_number = 'MCMS-2001-001'
ON CONFLICT (user_id, artifact_id) DO NOTHING;

INSERT INTO public.reviews (user_id, artifact_id, rating, title, body, is_approved)
SELECT p.id, a.id, 4, 'Stunning bronze work', 'The patina and form are remarkable. Would love to see more from this period.', true
FROM public.profiles p, public.artifacts a
WHERE p.role = 'visitor' AND a.accession_number = 'MCMS-2006-019'
ON CONFLICT (user_id, artifact_id) DO NOTHING;

INSERT INTO public.reviews (user_id, artifact_id, rating, title, body, is_approved)
SELECT p.id, a.id, 5, 'A textile treasure', 'The weaving technique is incredible for its age. A must-see.', false
FROM public.profiles p, public.artifacts a
WHERE p.role = 'visitor' AND a.accession_number = 'MCMS-2004-031'
ON CONFLICT (user_id, artifact_id) DO NOTHING;

INSERT INTO public.comments (user_id, artifact_id, body, is_approved)
SELECT p.id, a.id, 'I visited the museum last week and this was my favorite exhibit. The lighting really highlights the detail.', true
FROM public.profiles p, public.artifacts a
WHERE p.role = 'visitor' AND a.accession_number = 'MCMS-2003-022'
ON CONFLICT DO NOTHING;

INSERT INTO public.comments (user_id, artifact_id, body, is_approved)
SELECT p.id, a.id, 'Does anyone know if this artifact will be part of the upcoming exhibition?', false
FROM public.profiles p, public.artifacts a
WHERE p.role = 'visitor' AND a.accession_number = 'MCMS-2010-016'
ON CONFLICT DO NOTHING;

INSERT INTO public.category_likes (user_id, category_id)
SELECT p.id, c.id FROM public.profiles p, public.categories c
WHERE p.role = 'visitor' AND c.name = 'Sculpture'
ON CONFLICT (user_id, category_id) DO NOTHING;

INSERT INTO public.category_likes (user_id, category_id)
SELECT p.id, c.id FROM public.profiles p, public.categories c
WHERE p.role = 'visitor' AND c.name = 'Painting'
ON CONFLICT (user_id, category_id) DO NOTHING;

INSERT INTO public.category_likes (user_id, category_id)
SELECT p.id, c.id FROM public.profiles p, public.categories c
WHERE p.role = 'visitor' AND c.name = 'Metalwork'
ON CONFLICT (user_id, category_id) DO NOTHING;
