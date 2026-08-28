CREATE TYPE public.assistant_knowledge_audience AS ENUM ('public', 'internal');

ALTER TABLE public.assistant_knowledge
  ADD COLUMN audience public.assistant_knowledge_audience NOT NULL DEFAULT 'public';

CREATE INDEX assistant_knowledge_audience_idx
  ON public.assistant_knowledge (audience, is_published, updated_at DESC);

-- The public read policy must no longer expose internal help entries.
DROP POLICY "Published knowledge is readable" ON public.assistant_knowledge;

CREATE POLICY "Published public knowledge is readable"
  ON public.assistant_knowledge FOR SELECT
  TO anon, authenticated
  USING (is_published AND audience = 'public');

CREATE POLICY "Staff read published internal knowledge"
  ON public.assistant_knowledge FOR SELECT
  TO authenticated
  USING (
    is_published
    AND audience = 'internal'
    AND (
      private.has_role(auth.uid(), 'admin'::app_role)
      OR private.has_role(auth.uid(), 'administrator'::app_role)
      OR private.has_role(auth.uid(), 'editor'::app_role)
      OR private.has_role(auth.uid(), 'organizer'::app_role)
      OR private.has_role(auth.uid(), 'publisher'::app_role)
      OR private.has_role(auth.uid(), 'membership'::app_role)
    )
  );

INSERT INTO public.assistant_knowledge (kind, audience, title, body, keywords, link_path, is_published)
VALUES
  ('note', 'internal', 'Publishing an article',
   'An article moves through draft, review, scheduled and published. Publishing needs a title, a slug, a lead image and body text in the article''s primary language. Once an article is published its language set is locked: you can still edit the text, but you cannot add or remove a language afterwards, so decide on the languages before you publish. Scheduling sets a future publish time; the article stays invisible until then. Unpublishing takes it off /insights immediately and keeps the record.',
   ARRAY['article','publish','schedule','insights','draft','translation'], '/articles', true),
  ('note', 'internal', 'Article translations',
   'Translations are per language and are drafted with AI assistance from the primary language, then reviewed by a human before publishing. An untranslated language falls back to the primary language on the public site. Editing the primary text after translating does not re-translate automatically — re-run the assist for each language you changed.',
   ARRAY['translation','language','de','fr','it','ai'], '/articles', true),
  ('note', 'internal', 'Event registration modes',
   'Registration is one control with three parts: the on/off toggle, the audience (everyone, members only, or invited guests only) and the ticket checkbox. Audience "members only" also marks the event internal: it disappears from the public event list and only signed-in members can register. "Invited only" means nobody can register without an invitation you send from the guest list. Turning registration off removes the button but keeps existing registrations.',
   ARRAY['event','registration','rsvp','members only','invited','internal'], '/manage/events', true),
  ('note', 'internal', 'Event tickets, prices and refunds',
   'Ticking the ticket box turns on paid registration through the ticket tiers you define. Tiers can be member-priced, non-member-priced or general; the price a person pays is decided on the server from their member status, never from the browser. Discount codes apply per tier. Cancelling a paid registration triggers a refund through the payment provider — it is not reversible from here, so check the tier and the amount before you cancel. Changing a tier price does not change what already-paid attendees were charged.',
   ARRAY['ticket','tier','price','stripe','refund','discount','payment'], '/manage/events', true),
  ('note', 'internal', 'CCE credits for an event',
   'CCE credits are requested per event and move through draft, ready for review, submitted, approved or declined. The schedule rows must add up to the credit hours you claim, split into core competency and resource development. Approved credits let you issue certificates to attendees who were checked in. An event with no attendance recorded cannot issue certificates.',
   ARRAY['cce','credits','certificate','icf','attendance'], '/manage/events', true),
  ('note', 'internal', 'Attendance and check-in',
   'Attendance can be recorded at the door with the QR scanner, by the attendee scanning their own ticket during the open attendance window, or by importing a Zoom or Google Meet participant log. An import is previewed first and only applied when you confirm it. Undoing a check-in also withdraws any certificate issued from it.',
   ARRAY['attendance','check-in','qr','zoom','import','certificate'], '/manage/events', true),
  ('note', 'internal', 'Newsletters',
   'A newsletter is built from blocks. Blocks can be written by hand or drafted with AI, and images come from the built-in image search. The preview shows the real email rendering; send a test to yourself before scheduling. Once a newsletter is sent it cannot be recalled or edited.',
   ARRAY['newsletter','email','block','send','preview'], '/manage/newsletters', true),
  ('note', 'internal', 'Guest passes',
   'A member invites a guest with a name and an email only. The guest receives a personal link and fills in their own profile; only then does the request appear as pending for Membership & Engagement to approve or decline. A request that is still "waiting for guest" cannot be approved. Guest pass data is deleted after twelve months.',
   ARRAY['guest pass','guest','invitation','membership','approval'], '/manage/guest-passes', true),
  ('note', 'internal', 'Roles and access',
   'Rights are additive grants, never a status: giving someone Editor does not touch their membership or Member Area access. Administrator covers vocabularies, coach finder, operational structure, governance and the chat agent; Editor covers Insights; Event organizer covers events; Publisher may publish; Membership & Engagement covers guest passes and member engagement. Super Admin covers everything and cannot be removed from yourself or from the last remaining Super Admin.',
   ARRAY['roles','rights','admin','editor','organizer','publisher','membership','access'], '/roles', true),
  ('note', 'internal', 'Assistant knowledge entries',
   'Entries are either public — searched by the website assistant when a visitor asks a question — or internal, searched by the staff support agent inside these screens. Write one entry per topic in one language; both assistants translate on the fly. Unpublishing an entry hides it from the assistant without deleting it.',
   ARRAY['knowledge','assistant','faq','internal','public'], '/manage/knowledge', true);