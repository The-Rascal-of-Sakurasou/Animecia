-- Expand the Commons poster policy only to licenses that permit reuse and can be attributed in the UI.
update public.catalog_sources
set rights_review_status = 'approved',
    rights_reviewed_at = now(),
    rights_notes = 'Wikimedia Commons poster files are eligible only when each file exposes a verified CC0, Public Domain Mark, CC BY, or CC BY-SA license and a valid license URL. CC BY and CC BY-SA files must have an identifiable creator or explicit credit line; ANIXIA displays the file source and a direct license link beside the image. Non-commercial, no-derivatives, fair-use, all-rights-reserved, ambiguous, or missing-license files are rejected. The original file page and license URL are stored. Commons metadata is uploader-supplied and is not a warranty, so disputed or suspicious files must be excluded.'
where code = 'wikimedia_commons';
