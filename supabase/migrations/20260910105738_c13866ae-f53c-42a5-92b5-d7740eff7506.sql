insert into public.member_engagement_campaigns (key, mode, daily_cap)
values ('grace_first_warning', 'off', 50), ('grace_final_warning', 'off', 50)
on conflict (key) do nothing;