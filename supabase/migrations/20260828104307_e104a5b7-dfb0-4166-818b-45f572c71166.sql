-- 1. Status: add `invited` -------------------------------------------------
ALTER TABLE public.guest_passes DROP CONSTRAINT IF EXISTS guest_passes_status_check;
ALTER TABLE public.guest_passes
  ADD CONSTRAINT guest_passes_status_check
  CHECK (status IN ('pending','approved','declined','registered','cancelled','attended','invited'));

-- 2. The guest supplies these later, and both are optional for them ---------
ALTER TABLE public.guest_passes ALTER COLUMN guest_phone DROP NOT NULL;
ALTER TABLE public.guest_passes ALTER COLUMN guest_location DROP NOT NULL;

-- 3. Invitation token + consent bookkeeping ---------------------------------
ALTER TABLE public.guest_passes
  ADD COLUMN IF NOT EXISTS invite_token_hash text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS guest_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS follow_up_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS follow_up_consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS privacy_notice_version text;

CREATE UNIQUE INDEX IF NOT EXISTS guest_passes_invite_token_hash_idx
  ON public.guest_passes (invite_token_hash)
  WHERE invite_token_hash IS NOT NULL;

-- 4. The member's own insert now lands as `invited` -------------------------
DROP POLICY IF EXISTS "members create their own pending guest pass" ON public.guest_passes;
CREATE POLICY "members create their own guest pass invite"
  ON public.guest_passes FOR INSERT TO authenticated
  WITH CHECK (
    status = 'invited'
    AND EXISTS (
      SELECT 1 FROM public.members m
       WHERE m.id = guest_passes.inviting_member_id
         AND m.auth_user_id = auth.uid()
    )
  );

-- 5. Guard -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_guest_pass_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ev public.events%ROWTYPE;
  trusted boolean := coalesce(auth.role(), current_user) = 'service_role';
  staff boolean := auth.uid() IS NOT NULL AND private.is_membership_staff(auth.uid());
BEGIN
  NEW.updated_at = now();

  IF TG_OP = 'INSERT' THEN
    NEW.guest_email = lower(btrim(NEW.guest_email));

    IF NOT trusted AND NOT staff THEN
      -- A member may only ever name a guest; the guest completes the profile.
      NEW.status = 'invited';
      NEW.decision_by = NULL;
      NEW.decision_at = NULL;
      NEW.decision_note = NULL;
      NEW.registration_id = NULL;
      NEW.follow_up_status = 'none';
      NEW.follow_up_note = NULL;
      NEW.converted_member_id = NULL;
      NEW.follow_up_consent = false;
      NEW.follow_up_consent_at = NULL;
      NEW.guest_completed_at = NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.members m
       WHERE m.id = NEW.inviting_member_id
         AND m.activity_state = 'active'
    ) THEN
      RAISE EXCEPTION 'guest pass: the inviting member is not an active member';
    END IF;

    SELECT * INTO ev FROM public.events WHERE id = NEW.event_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'guest pass: event not found';
    END IF;
    IF NOT ev.guest_passes_allowed THEN
      RAISE EXCEPTION 'guest pass: this event does not offer guest passes';
    END IF;
    IF ev.registration_mode = 'none' THEN
      RAISE EXCEPTION 'guest pass: this event does not take registrations';
    END IF;

    -- `invited` and `pending` do not consume the pass; only a granted seat does.
    IF EXISTS (
      SELECT 1 FROM public.guest_passes g
       WHERE lower(g.guest_email) = NEW.guest_email
         AND g.status IN ('approved', 'registered', 'attended')
    ) THEN
      RAISE EXCEPTION 'guest pass: this guest has already used a guest pass';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.guest_passes g
       WHERE g.event_id = NEW.event_id
         AND lower(g.guest_email) = NEW.guest_email
    ) THEN
      RAISE EXCEPTION 'guest pass: this guest already has a request for this event';
    END IF;

    RETURN NEW;
  END IF;

  -- UPDATE: only staff or the trusted server path may move the decision, the
  -- status, or the consent record. The guest's own completion runs through the
  -- trusted server path, never through a browser client.
  IF NOT trusted AND NOT staff THEN
    NEW.status = OLD.status;
    NEW.decision_by = OLD.decision_by;
    NEW.decision_at = OLD.decision_at;
    NEW.decision_note = OLD.decision_note;
    NEW.registration_id = OLD.registration_id;
    NEW.follow_up_status = OLD.follow_up_status;
    NEW.follow_up_note = OLD.follow_up_note;
    NEW.converted_member_id = OLD.converted_member_id;
    NEW.invite_token_hash = OLD.invite_token_hash;
    NEW.invited_at = OLD.invited_at;
    NEW.guest_completed_at = OLD.guest_completed_at;
    NEW.follow_up_consent = OLD.follow_up_consent;
    NEW.follow_up_consent_at = OLD.follow_up_consent_at;
    NEW.privacy_notice_version = OLD.privacy_notice_version;
  END IF;

  RETURN NEW;
END;
$$;