/*
  # Review Summary Function

  Returns per-artifact review statistics (average rating, total count,
  per-star distribution) for published reviews. Used by the collection
  page to show rating summaries on artifact cards without fetching all
  reviews, and by the detail page for accurate aggregate stats.
*/

CREATE OR REPLACE FUNCTION public.get_artifact_review_summary(artifact_uuid uuid)
RETURNS TABLE (
  artifact_id uuid,
  average_rating numeric,
  review_count bigint,
  five_star bigint,
  four_star bigint,
  three_star bigint,
  two_star bigint,
  one_star bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    artifact_uuid AS artifact_id,
    COALESCE(AVG(rating), 0)::numeric AS average_rating,
    COUNT(*)::bigint AS review_count,
    COUNT(*) FILTER (WHERE rating = 5)::bigint AS five_star,
    COUNT(*) FILTER (WHERE rating = 4)::bigint AS four_star,
    COUNT(*) FILTER (WHERE rating = 3)::bigint AS three_star,
    COUNT(*) FILTER (WHERE rating = 2)::bigint AS two_star,
    COUNT(*) FILTER (WHERE rating = 1)::bigint AS one_star
  FROM public.reviews
  WHERE artifact_id = artifact_uuid
    AND status = 'published';
$$;

-- Grant execute to anon and authenticated so both guests and users can read summaries
GRANT EXECUTE ON FUNCTION public.get_artifact_review_summary(uuid) TO anon, authenticated;
