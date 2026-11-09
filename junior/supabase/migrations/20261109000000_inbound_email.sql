-- Inbound email: a lawyer forwards a judgment (or attaches a PDF) to Junior's
-- address and the drafts appear in To review. Nothing is approved or posted.
--
-- * The email itself is never stored here. Resend keeps it; Junior reads it when
--   it processes the message and keeps only the text the lawyer would have
--   pasted (as a brief), after personal details are stripped.
-- * A message is matched to a lawyer by the sender's address, and only acted on
--   when Resend's own receiving checks (DKIM or DMARC) pass. The webhook only
--   queues; processing is done by the server, so a retry cannot draft twice.
-- * Lawyers can read their own rows (to see what happened). Nobody can write.

create table public.inbound_messages (
  id uuid primary key default gen_random_uuid(),
  resend_email_id text not null unique,
  user_id uuid references auth.users (id) on delete cascade,
  sender text not null check (char_length(sender) <= 254),
  status text not null default 'received'
    check (status in ('received', 'processing', 'drafted', 'rejected', 'failed')),
  -- Written for the lawyer: why a message was not turned into drafts.
  reason text check (char_length(reason) <= 300),
  retryable boolean not null default false,
  attempts integer not null default 0,
  next_attempt_at timestamptz,
  brief_id uuid references public.briefs (id) on delete set null,
  redactions integer not null default 0 check (redactions >= 0),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index inbound_messages_user_idx on public.inbound_messages (user_id, received_at desc);
create index inbound_messages_work_idx on public.inbound_messages (status, next_attempt_at)
  where status in ('received', 'processing', 'failed');

alter table public.inbound_messages enable row level security;
create policy "inbound: read own" on public.inbound_messages
  for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.inbound_messages from anon, authenticated;
grant select (id, status, reason, brief_id, redactions, received_at, processed_at) on public.inbound_messages to authenticated;

-- Which lawyer owns an address. Reads auth.users, so only the server may ask.
create function public.sender_to_user(p_email text)
returns uuid
language sql
security definer
set search_path = ''
stable
as $$
  select u.id
    from auth.users u
   where lower(u.email) = lower(p_email)
     and u.email_confirmed_at is not null
     and u.deleted_at is null
   limit 1;
$$;

revoke execute on function public.sender_to_user(text) from public, anon, authenticated;

-- Take work. SKIP LOCKED means two runs never take the same message. A run that
-- died is taken again after 10 minutes. Four tries at most.
create function public.claim_inbound(p_resend_email_id text default null, p_limit integer default 3)
returns setof public.inbound_messages
language sql
security definer
set search_path = ''
as $$
  update public.inbound_messages m
     set status = 'processing', attempts = m.attempts + 1, updated_at = now()
   where m.id in (
     select i.id
       from public.inbound_messages i
      where i.user_id is not null
        and i.attempts < 4
        and (p_resend_email_id is null or i.resend_email_id = p_resend_email_id)
        and (
          i.status = 'received'
          or (i.status = 'failed' and i.retryable and coalesce(i.next_attempt_at, now()) <= now())
          or (i.status = 'processing' and i.updated_at < now() - interval '10 minutes')
        )
      order by i.received_at
      limit greatest(p_limit, 1)
      for update skip locked
   )
  returning m.*;
$$;

revoke execute on function public.claim_inbound(text, integer) from public, anon, authenticated;

create function public.purge_inbound()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Mail from people who are not users: kept a week, to spot abuse.
  delete from public.inbound_messages where user_id is null and received_at < now() - interval '7 days';
  delete from public.inbound_messages where received_at < now() - interval '90 days';
end;
$$;

revoke execute on function public.purge_inbound() from public, anon, authenticated;
select cron.schedule('junior-purge-inbound', '47 3 * * *', 'select public.purge_inbound()');

-- The minute-by-minute wake-up also fires when a message is waiting.
create or replace function public.wake_publisher()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'junior_publish_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'junior_cron_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  if not exists (
    select 1 from public.posts
    where status = 'scheduled' and scheduled_for <= now()
      and (publish_state is null or (publish_state = 'failed' and publish_retryable and coalesce(next_attempt_at, now()) <= now()))
      and public.can_auto_publish(user_id, channel)
  ) and not exists (
    select 1 from public.inbound_messages
    where user_id is not null and attempts < 4
      and (
        status = 'received'
        or (status = 'failed' and retryable and coalesce(next_attempt_at, now()) <= now())
        or (status = 'processing' and updated_at < now() - interval '10 minutes')
      )
  ) then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
end;
$$;
