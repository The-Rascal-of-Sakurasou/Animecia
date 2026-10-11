-- Public catalog search functions return only rows from the public catalog view.
-- Run them with caller permissions so row-level security remains in force.
ALTER FUNCTION public.search_anime_catalog(
  text, integer, text, text, text, bigint, bigint, text, integer, integer
) SECURITY INVOKER;

ALTER FUNCTION public.search_anime_catalog_v2(
  text, integer, text, text, text, bigint, bigint, text, integer, integer
) SECURITY INVOKER;

GRANT EXECUTE ON FUNCTION public.search_anime_catalog(
  text, integer, text, text, text, bigint, bigint, text, integer, integer
) TO anon, authenticated;

GRANT EXECUTE ON FUNCTION public.search_anime_catalog_v2(
  text, integer, text, text, text, bigint, bigint, text, integer, integer
) TO anon, authenticated;
