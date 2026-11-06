-- Junior, phase 3: brand colours, newsletter, results.
--
-- * Subscribers carry a consent record (how and when they agreed), as both
--   PDPAs expect. Someone who unsubscribed can only come back by signing up
--   again themselves.
-- * Every newsletter recipient gets one send row, so a retry never emails
--   the same person twice.
-- * Results come from the platforms where they allow it, and from the lawyer
--   where they do not (LinkedIn), plus enquiries the lawyer logs.

-- ---------------------------------------------------------------------------
-- Brand colours and newsletter settings
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column brand_cover text not null default '#171B28' check (brand_cover ~ '^#[0-9A-Fa-f]{6}$'),
  add column brand_card text not null default '#F1EBDE' check (brand_card ~ '^#[0-9A-Fa-f]{6}$'),
  add column brand_accent text not null default '#A8C0EA' check (brand_accent ~ '^#[0-9A-Fa-f]{6}$'),
  add column newsletter_enabled boolean not null default false,
  add column newsletter_from_name text not null default '' check (char_length(newsletter_from_name) <= 100),
  add column newsletter_reply_to text not null default '' check (char_length(newsletter_reply_to) <= 254),
  add column newsletter_footer text not null default '' check (char_length(newsletter_footer) <= 500),
  add column newsletter_slug text unique check (newsletter_slug ~ '^[a-z0-9-]{3,60}$');

-- ---------------------------------------------------------------------------
-- Subscribers
-- ---------------------------------------------------------------------------

create table public.subscribers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  name text not null default '' check (char_length(name) <= 120),
  status text not null default 'subscribed'
    check (status in ('pending', 'subscribed', 'unsubscribed', 'bounced', 'complained')),
  -- How consent was given: added by the lawyer, imported from a list the
  -- lawyer confirmed, or a public sign-up confirmed by email.
  consent_source text not null check (consent_source in ('manual', 'import', 'signup')),
  consent_note text not null default '' check (char_length(consent_note) <= 300),
  consented_at timestamptz,
  unsubscribed_at timestamptz,
  -- For confirm and unsubscribe links. Not readable by the lawyer.
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index subscribers_user_email_idx on public.subscribers (user_id, lower(email));
create index subscribers_user_status_idx on public.subscribers (user_id, status);

alter table public.subscribers enable row level security;

create policy "subscribers: read own" on public.subscribers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "subscribers: insert own" on public.subscribers
  for insert to authenticated
  with check ((select auth.uid()) = user_id and status = 'subscribed' and consent_source in ('manual', 'import'));
create policy "subscribers: update own" on public.subscribers
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "subscribers: delete own" on public.subscribers
  for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.subscribers from anon, authenticated;
grant select (id, user_id, email, name, status, consent_source, consent_note, consented_at, unsubscribed_at, created_at, updated_at)
  on public.subscribers to authenticated;
grant insert (email, name, status, consent_source, consent_note, consented_at) on public.subscribers to authenticated;
grant update (name, status) on public.subscribers to authenticated;
grant delete on public.subscribers to authenticated;

create function public.subscribers_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  -- A lawyer cannot put back someone who withdrew consent.
  if current_user = 'authenticated' and new.status is distinct from old.status then
    if new.status <> 'unsubscribed' then
      raise exception 'Only the subscriber can sign up again after unsubscribing';
    end if;
  end if;
  if new.status = 'unsubscribed' and old.status <> 'unsubscribed' then
    new.unsubscribed_at := now();
  end if;
  return new;
end;
$$;

create trigger subscribers_before_update
  before update on public.subscribers
  for each row execute function public.subscribers_before_update();

-- ---------------------------------------------------------------------------
-- Newsletter sends: one row per recipient per issue
-- ---------------------------------------------------------------------------

create table public.newsletter_sends (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts (id) on delete cascade,
  subscriber_id uuid references public.subscribers (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'delivered', 'bounced', 'complained', 'failed')),
  resend_id text unique,
  sent_at timestamptz,
  delivered_at timestamptz,
  opened_at timestamptz,
  clicked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (post_id, subscriber_id)
);

create index newsletter_sends_post_idx on public.newsletter_sends (post_id, status);

alter table public.newsletter_sends enable row level security;
create policy "newsletter sends: read own" on public.newsletter_sends
  for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.newsletter_sends from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Results and enquiries
-- ---------------------------------------------------------------------------

create table public.post_results (
  post_id uuid primary key references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  likes integer check (likes >= 0),
  comments integer check (comments >= 0),
  shares integer check (shares >= 0),
  recipients integer check (recipients >= 0),
  opens integer check (opens >= 0),
  clicks integer check (clicks >= 0),
  -- 'manual' when the lawyer typed the numbers in; the refresh job leaves those alone.
  source text not null default 'api' check (source in ('api', 'manual')),
  fetched_at timestamptz,
  fetch_error text check (char_length(fetch_error) <= 300),
  updated_at timestamptz not null default now()
);

alter table public.post_results enable row level security;
create policy "results: read own" on public.post_results
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "results: insert own" on public.post_results
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id and source = 'manual'
    and exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid()))
  );
create policy "results: update own" on public.post_results
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke insert, update, delete on public.post_results from anon, authenticated;
grant insert (post_id, likes, comments, shares, source) on public.post_results to authenticated;
grant update (likes, comments, shares, source, updated_at) on public.post_results to authenticated;

create table public.post_enquiries (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  received_on date not null default current_date,
  -- No names: the app checks this for personal details before saving.
  note text not null default '' check (char_length(note) <= 200),
  created_at timestamptz not null default now()
);

create index post_enquiries_post_idx on public.post_enquiries (post_id);

alter table public.post_enquiries enable row level security;
create policy "enquiries: read own" on public.post_enquiries
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "enquiries: insert own" on public.post_enquiries
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.posts p where p.id = post_id and p.user_id = (select auth.uid()) and p.status = 'posted')
  );
create policy "enquiries: delete own" on public.post_enquiries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- The publisher now sends newsletters too
-- ---------------------------------------------------------------------------

create function public.can_auto_publish(p_user_id uuid, p_channel text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when p_channel = 'newsletter' then exists (
      select 1 from public.profiles pr where pr.id = p_user_id and pr.newsletter_enabled
    )
    else exists (
      select 1 from public.social_connections c
      where c.user_id = p_user_id and c.provider = p_channel and c.status = 'active' and c.token_ciphertext is not null
    )
  end;
$$;

revoke execute on function public.can_auto_publish(uuid, text) from public, anon, authenticated;

create or replace function public.claim_due_posts(p_limit integer default 10, p_post_id uuid default null)
returns setof public.posts
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.posts
    set publish_state = 'failed', publish_retryable = false, publishing_started_at = null,
        publish_error = 'Junior lost track of this post while publishing it. Check the platform before you retry, so it does not go out twice.'
    where publish_state = 'publishing' and publishing_started_at < now() - interval '15 minutes';

  return query
  with due as (
    select p.id
    from public.posts p
    where p.status = 'scheduled'
      and p.scheduled_for <= now()
      and (p_post_id is null or p.id = p_post_id)
      and p.approved_hash = public.post_content_hash(p.title, p.body, p.cards)
      and (
        p.publish_state is null
        or (p.publish_state = 'failed' and p.publish_retryable and p.publish_attempts < 5
            and coalesce(p.next_attempt_at, now()) <= now())
      )
      and public.can_auto_publish(p.user_id, p.channel)
    order by p.scheduled_for
    limit greatest(1, least(coalesce(p_limit, 10), 50))
    for update of p skip locked
  )
  update public.posts p
    set publish_state = 'publishing', publishing_started_at = now(), publish_attempts = p.publish_attempts + 1
    from due
    where p.id = due.id
    returning p.*;
end;
$$;

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

-- Hourly: refresh likes and comments for recent posts.
create function public.wake_results()
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
  perform net.http_post(
    url := regexp_replace(v_url, '/publish$', '/results'),
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
end;
$$;

revoke execute on function public.wake_results() from public, anon, authenticated;

select cron.schedule('junior-refresh-results', '17 * * * *', 'select public.wake_results()');
