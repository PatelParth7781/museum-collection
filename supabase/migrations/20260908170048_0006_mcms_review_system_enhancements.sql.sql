/*
# Review System Security Hardening

## Summary
Ensures review moderation fields cannot be changed by regular users while
keeping the public review experience available to guests.

## Security changes
1. Non-admin users cannot create hidden or pending reviews through a crafted
   request; their new reviews are published using the existing product rule.
2. Non-admin users cannot change `status` or `is_approved` while editing their
   own review. Only admins can moderate those fields.
3. Review and comment text receives server-side length checks.
*/

ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_body_length_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_body_length_check CHECK (char_length(body) BETWEEN 1 AND 5000);
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_title_length_check;
ALTER TABLE public.reviews ADD CONSTRAINT reviews_title_length_check CHECK (char_length(title) BETWEEN 1 AND 120);
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS comments_body_length_check;
ALTER TABLE public.comments ADD CONSTRAINT comments_body_length_check CHECK (char_length(body) BETWEEN 1 AND 3000);

CREATE OR REPLACE FUNCTION public.sync_review_approval()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_is_admin boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) INTO caller_is_admin;

  IF NOT caller_is_admin THEN
    IF TG_OP = 'INSERT' THEN
      NEW.status := 'published';
    ELSE
      NEW.status := OLD.status;
    END IF;
  END IF;

  NEW.is_approved := (NEW.status = 'published');
  RETURN NEW;
END; $$;

REVOKE EXECUTE ON FUNCTION public.sync_review_approval() FROM PUBLIC;
