ALTER TABLE public.events ADD COLUMN IF NOT EXISTS hero_marks jsonb;
ALTER TABLE public.articles ADD COLUMN IF NOT EXISTS hero_marks jsonb;

CREATE OR REPLACE VIEW public.events_public AS
SELECT e.id,
    e.slug,
    e.title,
    e.summary,
    e.description,
    e.language,
    e.image_url,
    e.image_credit_name,
    e.image_credit_url,
    e.starts_at,
    e.ends_at,
    e.timezone,
    e.location_mode,
    e.venue_name,
    e.city,
    e.online_url,
    e.is_featured,
    e.registration_mode,
    e.capacity,
    e.guest_registration_allowed,
    e.registration_opens_at,
    e.registration_closes_at,
    private.event_confirmed_count(e.id) AS registration_count,
        CASE
            WHEN e.capacity IS NULL THEN NULL::integer
            ELSE GREATEST(e.capacity - private.event_confirmed_count(e.id), 0)
        END AS seats_remaining,
    e.capacity IS NOT NULL AND private.event_confirmed_count(e.id) >= e.capacity AS is_full,
    e.registration_mode = 'rsvp'::event_registration_mode AND (e.registration_opens_at IS NULL OR now() >= e.registration_opens_at) AND
        CASE
            WHEN e.registration_closes_at IS NOT NULL THEN now() <= e.registration_closes_at
            ELSE now() <= COALESCE(e.ends_at, e.starts_at)
        END AND (e.capacity IS NULL OR private.event_confirmed_count(e.id) < e.capacity) AS registration_open,
    c.slug AS category_slug,
    c.name AS category_name,
    r.slug AS region_slug,
    r.name AS region_name,
    e.published_at,
    e.updated_at,
    e.map_location,
    com.id AS community_id,
    com.slug AS community_slug,
    com.name AS community_name,
    e.hero_marks
   FROM events e
     LEFT JOIN cf_event_categories c ON c.id = e.category_id
     LEFT JOIN cf_regions r ON r.id = e.region_id
     LEFT JOIN op_projects com ON com.id = e.community_id AND com.is_community
  WHERE e.status = 'published'::event_status;