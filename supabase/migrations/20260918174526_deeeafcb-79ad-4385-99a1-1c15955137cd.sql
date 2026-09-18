CREATE POLICY "Membership staff can update engagement campaigns"
ON public.member_engagement_campaigns FOR UPDATE TO authenticated
USING (private.is_membership_staff(auth.uid()) OR private.is_platform_admin(auth.uid()))
WITH CHECK (private.is_membership_staff(auth.uid()) OR private.is_platform_admin(auth.uid()));

CREATE POLICY "Membership staff can update engagement sends"
ON public.member_engagement_sends FOR UPDATE TO authenticated
USING (private.is_membership_staff(auth.uid()) OR private.is_platform_admin(auth.uid()))
WITH CHECK (private.is_membership_staff(auth.uid()) OR private.is_platform_admin(auth.uid()));