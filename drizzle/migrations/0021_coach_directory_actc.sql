CREATE OR REPLACE FUNCTION private.directory_actc_awarded_on(_member_id uuid)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN upper(coalesce(m.diagnostics->>'actc_credential','')) = 'ACTC'
     AND (m.diagnostics->>'actc_credential_expire_date' IS NULL
          OR nullif(m.diagnostics->>'actc_credential_expire_date','')::date >= current_date)
    THEN coalesce(nullif(m.diagnostics->>'actc_credential_award_date','')::date, '1900-01-01'::date)
  END
  FROM public.members m WHERE m.id = _member_id
$$;
REVOKE ALL ON FUNCTION private.directory_actc_awarded_on(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.directory_actc_awarded_on(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE VIEW public.coach_directory_public WITH (security_invoker = on) AS
 SELECT p.id AS profile_id, m.id AS member_id, m.full_name, m.city, m.country, m.organisation,
    upper(m.credential_slug) AS credential_slug, m.credential_awarded_on,
    p.tagline, p.description, p.website_url, p.linkedin_url, p.profile_image_path, p.availability_slug,
    p.coaching_available, p.mentor_accredited, p.mentoring_available, p.supervision_accredited,
    p.supervision_available, p.booking_url, p.response_time_note, p.approach, p.qualifications,
    p.experience_band, p.session_length_note, p.fees_note, p.availability_note,
    p.testimonial_quote, p.testimonial_attribution, p.primary_locale,
    COALESCE(( SELECT jsonb_object_agg(t.locale, jsonb_build_object('tagline', t.tagline, 'description', t.description, 'approach', t.approach, 'qualifications', t.qualifications, 'fees_note', t.fees_note, 'session_length_note', t.session_length_note, 'availability_note', t.availability_note, 'response_time_note', t.response_time_note, 'testimonial_quote', t.testimonial_quote, 'testimonial_attribution', t.testimonial_attribution))
           FROM member_profile_translations t WHERE t.profile_id = p.id AND t.is_ready), '{}'::jsonb) AS translations,
    private.directory_contact_email(p.id) AS contact_email,
    array_remove(ARRAY[
        CASE WHEN p.coaching_available THEN 'coaching'::text ELSE NULL::text END,
        CASE WHEN p.mentoring_available THEN 'mentoring'::text ELSE NULL::text END,
        CASE WHEN p.supervision_available THEN 'supervision'::text ELSE NULL::text END], NULL::text) AS services,
    COALESCE(( SELECT array_agg(r.slug ORDER BY r.sort_order) FROM member_profile_regions mpr JOIN cf_regions r ON r.id = mpr.region_id WHERE mpr.profile_id = p.id), '{}'::text[]) AS region_slugs,
    COALESCE(( SELECT array_agg(l.slug ORDER BY l.sort_order) FROM member_profile_languages mpl JOIN cf_languages l ON l.id = mpl.language_id WHERE mpl.profile_id = p.id), '{}'::text[]) AS language_slugs,
    COALESCE(( SELECT array_agg(s.slug ORDER BY s.sort_order) FROM member_profile_specialisations mps JOIN cf_specialisations s ON s.id = mps.specialisation_id WHERE mps.profile_id = p.id), '{}'::text[]) AS specialisation_slugs,
    COALESCE(( SELECT array_agg(f.slug ORDER BY f.sort_order) FROM member_profile_formats mpf JOIN cf_formats f ON f.id = mpf.format_id WHERE mpf.profile_id = p.id), '{}'::text[]) AS format_slugs,
    COALESCE(( SELECT array_agg(ct.slug ORDER BY ct.sort_order) FROM member_profile_client_types mpc JOIN cf_client_types ct ON ct.id = mpc.client_type_id WHERE mpc.profile_id = p.id), '{}'::text[]) AS client_type_slugs,
    member_is_active(m.activity_state) AS is_active_member,
    member_has_directory_credential(m.credential_slug, m.credential_expires_on) AS has_directory_credential,
    true AS is_directory_eligible,
    true AS is_directory_visible,
    p.updated_at,
    (private.directory_actc_awarded_on(m.id) IS NOT NULL) AS has_actc,
    NULLIF(private.directory_actc_awarded_on(m.id), '1900-01-01'::date) AS actc_awarded_on
   FROM member_directory_profiles p JOIN members m ON m.id = p.member_id
  WHERE p.visibility = 'published'::member_visibility
    AND (member_is_active(m.activity_state) OR directory_allows_non_credentialed() AND m.activity_state = 'grace'::member_activity_state)
    AND (member_has_directory_credential(m.credential_slug, m.credential_expires_on) OR directory_allows_non_credentialed());