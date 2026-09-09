ALTER TABLE public.member_lifecycle_queue
  ADD COLUMN IF NOT EXISTS final_notice_at timestamptz;

COMMENT ON COLUMN public.member_lifecycle_queue.notified_at IS
  'When the 30-day grace warning email was sent to the member.';
COMMENT ON COLUMN public.member_lifecycle_queue.final_notice_at IS
  'When the 7-day final grace warning email was sent to the member.';