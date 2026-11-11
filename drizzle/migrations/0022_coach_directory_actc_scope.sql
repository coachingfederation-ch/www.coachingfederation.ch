CREATE OR REPLACE FUNCTION private.directory_actc_awarded_on(_member_id uuid)
RETURNS date LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN upper(coalesce(m.diagnostics->>'actc_credential','')) = 'ACTC'
     AND (nullif(m.diagnostics->>'actc_credential_expire_date','') IS NULL
          OR nullif(m.diagnostics->>'actc_credential_expire_date','')::date >= current_date)
    THEN coalesce(nullif(m.diagnostics->>'actc_credential_award_date','')::date, '1900-01-01'::date)
  END
  FROM public.members m
  WHERE m.id = _member_id
    AND EXISTS (SELECT 1 FROM public.member_directory_profiles p
                WHERE p.member_id = m.id AND p.visibility = 'published')
$$;