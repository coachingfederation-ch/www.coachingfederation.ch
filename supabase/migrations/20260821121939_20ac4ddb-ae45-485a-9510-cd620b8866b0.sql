CREATE TABLE public.internal_accounts (
  auth_user_id uuid PRIMARY KEY,
  display_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  invited_by uuid,
  invited_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.internal_accounts TO authenticated;
GRANT ALL ON public.internal_accounts TO service_role;

ALTER TABLE public.internal_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins manage internal accounts"
  ON public.internal_accounts FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'))
  WITH CHECK (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "internal accounts read own row"
  ON public.internal_accounts FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE TRIGGER internal_accounts_touch_updated_at
  BEFORE UPDATE ON public.internal_accounts
  FOR EACH ROW EXECUTE FUNCTION public.tg_touch_updated_at();

-- True for a live (not withdrawn) internal staff account. Security definer so
-- the grant policy can consult it without granting the caller table access.
CREATE OR REPLACE FUNCTION private.is_internal_account(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.internal_accounts ia
    WHERE ia.auth_user_id = _user_id
      AND ia.revoked_at IS NULL
  )
$$;

-- Backfill today's inferred internal accounts so the existing screen is unchanged.
INSERT INTO public.internal_accounts (auth_user_id, invited_at, accepted_at)
SELECT DISTINCT ur.user_id, now(), now()
FROM public.user_roles ur
WHERE ur.role IN ('admin','administrator','editor','organizer','publisher')
  AND NOT EXISTS (
    SELECT 1 FROM public.members m WHERE m.auth_user_id = ur.user_id
  )
ON CONFLICT (auth_user_id) DO NOTHING;

-- Managed roles may now also be granted to an explicitly recorded internal
-- account; the Super Admin grant is unchanged.
DROP POLICY "admins grant managed roles" ON public.user_roles;
CREATE POLICY "admins grant managed roles"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin')
    AND (
      (
        role = ANY (ARRAY['administrator'::app_role, 'editor'::app_role, 'organizer'::app_role, 'publisher'::app_role])
        AND (private.has_role(user_id, 'member') OR private.is_internal_account(user_id))
      )
      OR role = 'admin'::app_role
    )
  );