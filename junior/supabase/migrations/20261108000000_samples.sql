-- Free samples: someone who has not signed up sends one extract and gets one
-- LinkedIn draft back.
--
-- * Nobody gets a draft until they click the link in an email, so nobody can
--   spend Junior's money (or fill an inbox) by typing in someone else's address.
-- * One sample per person: email_key folds "+tags" and Gmail dots together.
-- * The pasted text is kept only until the draft is written. The draft is kept
--   for 30 days. Rows nobody finished are deleted after 3 days.
-- * Only the server (service role) touches this table. There are no policies.

create table public.sample_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null check (char_length(email) <= 254),
  email_key text not null check (char_length(email_key) <= 254),
  token text not null unique check (token ~ '^[0-9a-f]{48}$'),
  status text not null default 'pending'
    check (status in ('pending', 'drafting', 'drafted', 'failed')),
  jurisdiction text not null check (jurisdiction in ('MY', 'SG', 'BOTH')),
  source_text text check (char_length(source_text) <= 30000),
  redactions integer not null default 0 check (redactions >= 0),
  draft jsonb,
  drafted_with text,
  error text,
  attempts integer not null default 0,
  follow_up_ok boolean not null default false,
  ip_hash text,
  link_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  drafted_at timestamptz
);

create unique index sample_requests_email_key_idx on public.sample_requests (email_key);
create index sample_requests_ip_idx on public.sample_requests (ip_hash, created_at);
create index sample_requests_drafted_idx on public.sample_requests (drafted_at) where drafted_at is not null;

alter table public.sample_requests enable row level security;
revoke all on public.sample_requests from anon, authenticated;

create function public.sample_requests_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger sample_requests_touch
  before update on public.sample_requests
  for each row execute function public.sample_requests_touch();

-- Take the one turn at drafting. Exactly one caller wins, so a double click or
-- a retry cannot write two drafts. A run that died (the server was stopped
-- part-way) can be taken again after 6 minutes. Three tries at most.
create function public.claim_sample(p_token text)
returns table (id uuid, email text, jurisdiction text, source_text text, redactions integer)
language sql
security definer
set search_path = ''
as $$
  update public.sample_requests s
     set status = 'drafting', attempts = s.attempts + 1, error = null
   where s.token = p_token
     and s.source_text is not null
     and s.attempts < 3
     and (
       s.status in ('pending', 'failed')
       or (s.status = 'drafting' and s.updated_at < now() - interval '6 minutes')
     )
  returning s.id, s.email, s.jurisdiction, s.source_text, s.redactions;
$$;

revoke execute on function public.claim_sample(text) from public, anon, authenticated;

-- Housekeeping, run nightly.
create function public.purge_samples()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Never finished: the pasted text goes with the row.
  delete from public.sample_requests
   where status <> 'drafted' and created_at < now() - interval '3 days';

  -- The draft and anything pasted are not kept past 30 days.
  update public.sample_requests
     set draft = null, source_text = null
   where drafted_at < now() - interval '30 days'
     and (draft is not null or source_text is not null);

  -- Keep the email longer only if the person said we could follow up.
  delete from public.sample_requests
   where status = 'drafted' and not follow_up_ok and drafted_at < now() - interval '90 days';
end;
$$;

revoke execute on function public.purge_samples() from public, anon, authenticated;

select cron.schedule('junior-purge-samples', '41 3 * * *', 'select public.purge_samples()');
