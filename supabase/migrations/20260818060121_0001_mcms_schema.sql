/*
# Museum Collection Management System (MCMS) — Core Schema

## Overview
Creates the complete database schema for a museum digital collection platform
with role-based access control (admin, curator, visitor).

## Tables Created
1. **profiles** — extends auth.users with role, full name, avatar, status
2. **categories** — artifact classification (sculpture, painting, textile, etc.)
3. **artists** — creators/makers of artifacts
4. **historical_periods** — time periods for artifacts
5. **locations** — physical storage (building > gallery > room > shelf)
6. **artifacts** — the core collection records
7. **artifact_images** — image gallery per artifact (URLs reference Storage)
8. **exhibitions** — curated displays with dates and locations
9. **exhibition_artifacts** — join table linking artifacts to exhibitions
10. **acquisitions** — how/when artifacts were acquired
11. **provenance_records** — ownership history of artifacts
12. **conservation_records** — condition assessments and treatments
13. **favorites** — visitor bookmarked artifacts
14. **audit_logs** — system activity tracking

## Helper Functions
- `has_role(role text)` — SECURITY DEFINER, checks if current user has a given role
- `is_staff()` — checks if current user is admin or curator
- `is_admin()` — checks if current user is admin
- `log_action(...)` — SECURITY DEFINER, inserts audit log entries

## Triggers
- Auto-create profile on auth.users insert
- Auto-update updated_at on row change

## Security (RLS)
- RLS enabled on every table
- Public (anon) can read public artifacts, categories, artists, periods, exhibitions
- Visitors can manage their own favorites and read public data
- Curators can manage collection data (artifacts, images, conservation, provenance, exhibitions)
- Admins can manage everything including users and audit logs
- Role checks via SECURITY DEFINER helper functions to avoid RLS recursion
*/

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- PROFILES (must exist before helper functions that reference it)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'visitor'
    CHECK (role IN ('admin', 'curator', 'visitor')),
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Trigger: auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Trigger: auto-create profile when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'visitor')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- HELPER FUNCTIONS (SECURITY DEFINER — bypass RLS for role checks)
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(p_role text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = p_role AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'curator') AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

-- ============================================================
-- PROFILE POLICIES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own_or_staff" ON public.profiles;
CREATE POLICY "profiles_select_own_or_staff" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_staff());

DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
CREATE POLICY "profiles_update_admin" ON public.profiles
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
CREATE POLICY "profiles_insert_admin" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

-- ============================================================
-- CATEGORIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "categories_select_public" ON public.categories;
CREATE POLICY "categories_select_public" ON public.categories
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "categories_insert_staff" ON public.categories;
CREATE POLICY "categories_insert_staff" ON public.categories
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "categories_update_staff" ON public.categories;
CREATE POLICY "categories_update_staff" ON public.categories
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "categories_delete_staff" ON public.categories;
CREATE POLICY "categories_delete_staff" ON public.categories
  FOR DELETE TO authenticated USING (public.is_staff());

-- ============================================================
-- ARTISTS / CREATORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.artists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  biography text DEFAULT '',
  birth_year integer,
  death_year integer,
  nationality text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artists_select_public" ON public.artists;
CREATE POLICY "artists_select_public" ON public.artists
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "artists_insert_staff" ON public.artists;
CREATE POLICY "artists_insert_staff" ON public.artists
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "artists_update_staff" ON public.artists;
CREATE POLICY "artists_update_staff" ON public.artists
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "artists_delete_staff" ON public.artists;
CREATE POLICY "artists_delete_staff" ON public.artists
  FOR DELETE TO authenticated USING (public.is_staff());

-- ============================================================
-- HISTORICAL PERIODS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.historical_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  start_year integer,
  end_year integer,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.historical_periods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "periods_select_public" ON public.historical_periods;
CREATE POLICY "periods_select_public" ON public.historical_periods
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "periods_insert_staff" ON public.historical_periods;
CREATE POLICY "periods_insert_staff" ON public.historical_periods
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "periods_update_staff" ON public.historical_periods;
CREATE POLICY "periods_update_staff" ON public.historical_periods
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "periods_delete_staff" ON public.historical_periods;
CREATE POLICY "periods_delete_staff" ON public.historical_periods
  FOR DELETE TO authenticated USING (public.is_staff());

-- ============================================================
-- LOCATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building text NOT NULL DEFAULT '',
  gallery text NOT NULL DEFAULT '',
  room text DEFAULT '',
  shelf_or_display text DEFAULT '',
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "locations_select_public" ON public.locations;
CREATE POLICY "locations_select_public" ON public.locations
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "locations_insert_staff" ON public.locations;
CREATE POLICY "locations_insert_staff" ON public.locations
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "locations_update_staff" ON public.locations;
CREATE POLICY "locations_update_staff" ON public.locations
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "locations_delete_staff" ON public.locations;
CREATE POLICY "locations_delete_staff" ON public.locations
  FOR DELETE TO authenticated USING (public.is_staff());

-- ============================================================
-- ARTIFACTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accession_number text NOT NULL UNIQUE,
  name text NOT NULL,
  description text DEFAULT '',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  historical_period_id uuid REFERENCES public.historical_periods(id) ON DELETE SET NULL,
  origin text DEFAULT '',
  creation_date text DEFAULT '',
  material text DEFAULT '',
  dimensions text DEFAULT '',
  weight text DEFAULT '',
  condition text NOT NULL DEFAULT 'good'
    CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'critical', 'restored')),
  acquisition_date date,
  acquisition_method text DEFAULT ''
    CHECK (acquisition_method IN ('', 'purchase', 'donation', 'bequest', 'excavation', 'field_collection', 'exchange')),
  ownership_status text NOT NULL DEFAULT 'owned'
    CHECK (ownership_status IN ('owned', 'on_loan', 'borrowed', 'joint_ownership')),
  current_location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'on_loan', 'in_conservation', 'archived')),
  is_public boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artifacts_select" ON public.artifacts;
CREATE POLICY "artifacts_select" ON public.artifacts
  FOR SELECT TO anon, authenticated
  USING (is_public = true OR public.is_staff());

DROP POLICY IF EXISTS "artifacts_insert_staff" ON public.artifacts;
CREATE POLICY "artifacts_insert_staff" ON public.artifacts
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "artifacts_update_staff" ON public.artifacts;
CREATE POLICY "artifacts_update_staff" ON public.artifacts
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "artifacts_delete_staff" ON public.artifacts;
CREATE POLICY "artifacts_delete_staff" ON public.artifacts
  FOR DELETE TO authenticated USING (public.is_staff());

DROP TRIGGER IF EXISTS artifacts_updated_at ON public.artifacts;
CREATE TRIGGER artifacts_updated_at
  BEFORE UPDATE ON public.artifacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_artifacts_accession_number ON public.artifacts(accession_number);
CREATE INDEX IF NOT EXISTS idx_artifacts_name ON public.artifacts(name);
CREATE INDEX IF NOT EXISTS idx_artifacts_category_id ON public.artifacts(category_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_artist_id ON public.artifacts(artist_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_period_id ON public.artifacts(historical_period_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_location_id ON public.artifacts(current_location_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_status ON public.artifacts(status);
CREATE INDEX IF NOT EXISTS idx_artifacts_condition ON public.artifacts(condition);
CREATE INDEX IF NOT EXISTS idx_artifacts_is_public ON public.artifacts(is_public);

-- ============================================================
-- ARTIFACT IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.artifact_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  caption text DEFAULT '',
  is_primary boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.artifact_images ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "artifact_images_select" ON public.artifact_images;
CREATE POLICY "artifact_images_select" ON public.artifact_images
  FOR SELECT TO anon, authenticated
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.artifacts a
      WHERE a.id = artifact_images.artifact_id AND a.is_public = true
    )
  );

DROP POLICY IF EXISTS "artifact_images_insert_staff" ON public.artifact_images;
CREATE POLICY "artifact_images_insert_staff" ON public.artifact_images
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "artifact_images_update_staff" ON public.artifact_images;
CREATE POLICY "artifact_images_update_staff" ON public.artifact_images
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "artifact_images_delete_staff" ON public.artifact_images;
CREATE POLICY "artifact_images_delete_staff" ON public.artifact_images
  FOR DELETE TO authenticated USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_artifact_images_artifact_id ON public.artifact_images(artifact_id);

-- ============================================================
-- EXHIBITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exhibitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  start_date date,
  end_date date,
  location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'active', 'ended', 'cancelled')),
  cover_image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.exhibitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exhibitions_select" ON public.exhibitions;
CREATE POLICY "exhibitions_select" ON public.exhibitions
  FOR SELECT TO anon, authenticated
  USING (status IN ('upcoming', 'active', 'ended') OR public.is_staff());

DROP POLICY IF EXISTS "exhibitions_insert_staff" ON public.exhibitions;
CREATE POLICY "exhibitions_insert_staff" ON public.exhibitions
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "exhibitions_update_staff" ON public.exhibitions;
CREATE POLICY "exhibitions_update_staff" ON public.exhibitions
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "exhibitions_delete_staff" ON public.exhibitions;
CREATE POLICY "exhibitions_delete_staff" ON public.exhibitions
  FOR DELETE TO authenticated USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_exhibitions_status ON public.exhibitions(status);
CREATE INDEX IF NOT EXISTS idx_exhibitions_dates ON public.exhibitions(start_date, end_date);

-- ============================================================
-- EXHIBITION ARTIFACTS (join table)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.exhibition_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exhibition_id uuid NOT NULL REFERENCES public.exhibitions(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exhibition_id, artifact_id)
);

ALTER TABLE public.exhibition_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "exhibition_artifacts_select" ON public.exhibition_artifacts;
CREATE POLICY "exhibition_artifacts_select" ON public.exhibition_artifacts
  FOR SELECT TO anon, authenticated
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.exhibitions e
      WHERE e.id = exhibition_artifacts.exhibition_id
      AND e.status IN ('upcoming', 'active', 'ended')
    )
  );

DROP POLICY IF EXISTS "exhibition_artifacts_insert_staff" ON public.exhibition_artifacts;
CREATE POLICY "exhibition_artifacts_insert_staff" ON public.exhibition_artifacts
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "exhibition_artifacts_update_staff" ON public.exhibition_artifacts;
CREATE POLICY "exhibition_artifacts_update_staff" ON public.exhibition_artifacts
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "exhibition_artifacts_delete_staff" ON public.exhibition_artifacts;
CREATE POLICY "exhibition_artifacts_delete_staff" ON public.exhibition_artifacts
  FOR DELETE TO authenticated USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_exh_artifacts_exhibition ON public.exhibition_artifacts(exhibition_id);
CREATE INDEX IF NOT EXISTS idx_exh_artifacts_artifact ON public.exhibition_artifacts(artifact_id);

-- ============================================================
-- ACQUISITIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.acquisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  acquisition_date date,
  acquisition_method text DEFAULT ''
    CHECK (acquisition_method IN ('', 'purchase', 'donation', 'bequest', 'excavation', 'field_collection', 'exchange')),
  source text DEFAULT '',
  price numeric(12,2),
  donor_name text DEFAULT '',
  documentation text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.acquisitions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acquisitions_select_staff" ON public.acquisitions;
CREATE POLICY "acquisitions_select_staff" ON public.acquisitions
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "acquisitions_insert_staff" ON public.acquisitions;
CREATE POLICY "acquisitions_insert_staff" ON public.acquisitions
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "acquisitions_update_staff" ON public.acquisitions;
CREATE POLICY "acquisitions_update_staff" ON public.acquisitions
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "acquisitions_delete_staff" ON public.acquisitions;
CREATE POLICY "acquisitions_delete_staff" ON public.acquisitions
  FOR DELETE TO authenticated USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_acquisitions_artifact ON public.acquisitions(artifact_id);
CREATE INDEX IF NOT EXISTS idx_acquisitions_date ON public.acquisitions(acquisition_date);

-- ============================================================
-- PROVENANCE RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.provenance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  owner_name text NOT NULL DEFAULT '',
  location text DEFAULT '',
  start_date date,
  end_date date,
  ownership_type text DEFAULT 'private'
    CHECK (ownership_type IN ('private', 'institutional', 'government', 'religious', 'unknown')),
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.provenance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provenance_select" ON public.provenance_records;
CREATE POLICY "provenance_select" ON public.provenance_records
  FOR SELECT TO anon, authenticated
  USING (
    public.is_staff()
    OR EXISTS (
      SELECT 1 FROM public.artifacts a
      WHERE a.id = provenance_records.artifact_id AND a.is_public = true
    )
  );

DROP POLICY IF EXISTS "provenance_insert_staff" ON public.provenance_records;
CREATE POLICY "provenance_insert_staff" ON public.provenance_records
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "provenance_update_staff" ON public.provenance_records;
CREATE POLICY "provenance_update_staff" ON public.provenance_records
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "provenance_delete_staff" ON public.provenance_records;
CREATE POLICY "provenance_delete_staff" ON public.provenance_records
  FOR DELETE TO authenticated USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_provenance_artifact ON public.provenance_records(artifact_id);

-- ============================================================
-- CONSERVATION RECORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.conservation_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  assessment_date date NOT NULL DEFAULT now()::date,
  condition text NOT NULL DEFAULT 'good'
    CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'critical', 'restored')),
  treatment text DEFAULT '',
  conservator text DEFAULT '',
  treatment_date date,
  next_inspection_date date,
  notes text DEFAULT '',
  before_image_url text,
  after_image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.conservation_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conservation_select_staff" ON public.conservation_records;
CREATE POLICY "conservation_select_staff" ON public.conservation_records
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS "conservation_insert_staff" ON public.conservation_records;
CREATE POLICY "conservation_insert_staff" ON public.conservation_records
  FOR INSERT TO authenticated WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "conservation_update_staff" ON public.conservation_records;
CREATE POLICY "conservation_update_staff" ON public.conservation_records
  FOR UPDATE TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

DROP POLICY IF EXISTS "conservation_delete_staff" ON public.conservation_records;
CREATE POLICY "conservation_delete_staff" ON public.conservation_records
  FOR DELETE TO authenticated USING (public.is_staff());

CREATE INDEX IF NOT EXISTS idx_conservation_artifact ON public.conservation_records(artifact_id);
CREATE INDEX IF NOT EXISTS idx_conservation_next_inspection ON public.conservation_records(next_inspection_date);

-- ============================================================
-- FAVORITES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  artifact_id uuid NOT NULL REFERENCES public.artifacts(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, artifact_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
CREATE POLICY "favorites_select_own" ON public.favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
CREATE POLICY "favorites_insert_own" ON public.favorites
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
CREATE POLICY "favorites_delete_own" ON public.favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_artifact ON public.favorites(artifact_id);

-- ============================================================
-- AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  action text NOT NULL DEFAULT '',
  entity_type text NOT NULL DEFAULT '',
  entity_id uuid,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "audit_logs_insert_auth" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_auth" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- SECURITY DEFINER function to insert audit logs
CREATE OR REPLACE FUNCTION public.log_action(
  p_action text,
  p_entity_type text DEFAULT '',
  p_entity_id uuid DEFAULT NULL,
  p_description text DEFAULT ''
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, description)
  VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_description);
END;
$$;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
