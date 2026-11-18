insert into public.catalog_sources (
  code, display_name, website_url, api_docs_url, terms_url,
  rights_review_status, rights_reviewed_at, rights_notes, is_enabled
) values (
  'wikimedia_commons',
  'Wikimedia Commons',
  'https://commons.wikimedia.org/',
  'https://www.mediawiki.org/wiki/API:Main_page',
  'https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia',
  'approved',
  now(),
  'Poster files are eligible only when the individual file metadata exposes a permitted public-domain or Creative Commons BY/BY-SA license, a valid license URL, and attribution data where required. Non-commercial, no-derivatives, fair-use, all-rights-reserved, ambiguous, or missing-license files are rejected. Attribution and source-page URL are stored with each accepted file.',
  true
)
on conflict (code) do update set
  display_name = excluded.display_name,
  website_url = excluded.website_url,
  api_docs_url = excluded.api_docs_url,
  terms_url = excluded.terms_url,
  rights_review_status = excluded.rights_review_status,
  rights_reviewed_at = excluded.rights_reviewed_at,
  rights_notes = excluded.rights_notes,
  is_enabled = excluded.is_enabled,
  updated_at = now();