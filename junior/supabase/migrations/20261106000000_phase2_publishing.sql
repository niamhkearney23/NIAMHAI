-- Junior, phase 2: social connections and scheduled publishing.
--
-- * Tokens are encrypted by the app (AES-256-GCM) before they reach the
--   database, and the token columns are not readable by signed-in users at
--   all. Only the server, with the service role, can read them.
-- * The publisher claims due posts with a lock, so a post is never picked up
--   twice. It only publishes text whose fingerprint matches what the lawyer
--   approved.
-- * A post that was mid-publish when something crashed is never retried
--   automatically, because it may already be live. The lawyer checks and
--   retries by hand.

-- ---------------------------------------------------------------------------
-- Connections
-- ---------------------------------------------------------------------------

create table public.social_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('facebook', 'instagram', 'linkedin')),
  status text not null default 'active' check (status in ('active', 'pending', 'expired')),
  -- Facebook Page id, Instagram user id or LinkedIn member id
  external_id text,
  display_name text not null default '' check (char_length(display_name) <= 200),
  -- Encrypted access token (app-held key). Never selectable by clients.
  token_ciphertext text,
  token_expires_at timestamptz,
  -- Facebook only: the Pages to choose from, encrypted, while status = 'pending'.
  pending_ciphertext text,
  scopes text[] not null default '{}',
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.social_connections enable row level security;

create policy "connections: read own" on public.social_connections
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.social_connections from anon, authenticated;
grant select (id, user_id, provider, status, external_id, display_name, token_expires_at, scopes, connected_at, updated_at)
  on public.social_connections to authenticated;

-- ---------------------------------------------------------------------------
-- Publish state on posts
-- ---------------------------------------------------------------------------

alter table public.posts
  add column publish_state text check (publish_state in ('publishing', 'failed')),
  add column publish_attempts integer not null default 0,
  add column publish_error text check (char_length(publish_error) <= 1000),
  add column publish_retryable boolean not null default true,
  add column next_attempt_at timestamptz,
  add column publishing_started_at timestamptz,
  add column external_id text,
  add column external_url text,
  add column published_via text check (published_via in ('junior', 'manual'));

create index posts_due_idx on public.posts (scheduled_for) where status = 'scheduled';

alter table public.approval_log drop constraint approval_log_action_check;
alter table public.approval_log add constraint approval_log_action_check check (action in (
  'approved', 'approval_revoked', 'scheduled', 'unscheduled', 'marked_posted',
  'check_ticked', 'check_unticked', 'publish_requested', 'published', 'publish_failed'
));

-- The publisher has no user session; name it in the log.
create or replace function public.log_post_event(p_post public.posts, p_action text, p_detail jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.approval_log (post_id, user_id, actor_email, action, channel, content_hash, content_snapshot, detail)
  values (
    p_post.id,
    coalesce(auth.uid(), p_post.user_id),
    coalesce(auth.jwt() ->> 'email', case when auth.uid() is null then 'Junior publisher' else '' end),
    p_action,
    p_post.channel,
    public.post_content_hash(p_post.title, p_post.body, p_post.cards),
    case when p_action in ('approved', 'published')
      then jsonb_build_object('title', p_post.title, 'body', p_post.body, 'cards', p_post.cards)
      else null end,
    coalesce(p_detail, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.log_post_event(public.posts, text, jsonb) from public, anon, authenticated;

create or replace function public.posts_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if (new.title, new.body, new.cards) is distinct from (old.title, old.body, old.cards) then
    if old.status = 'posted' then
      raise exception 'This post has already gone out and cannot be edited';
    end if;
    if old.publish_state = 'publishing' then
      raise exception 'Junior is publishing this post right now. Wait a moment, then try again.';
    end if;
    -- Changing the words after approval withdraws the approval.
    if old.status in ('approved', 'scheduled') then
      new.status := 'to_review';
      new.approved_at := null;
      new.approved_by := null;
      new.approved_hash := null;
      new.publish_state := null;
      new.publish_error := null;
      new.publish_attempts := 0;
      new.next_attempt_at := null;
      perform public.log_post_event(new, 'approval_revoked', jsonb_build_object('reason', 'content edited'));
    end if;
  end if;
  return new;
end;
$$;

-- Lawyers' workflow functions must not run while a publish is in flight.
create function public.assert_not_publishing(p_post public.posts)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_post.publish_state = 'publishing' then
    raise exception 'Junior is publishing this post right now. Wait a moment, then try again.';
  end if;
end;
$$;

create or replace function public.schedule_post(p_post_id uuid, p_at timestamptz)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  v_post := public.own_post_for_update(p_post_id);
  perform public.assert_not_publishing(v_post);

  if v_post.status not in ('approved', 'scheduled') then
    raise exception 'Approve the post before scheduling it';
  end if;
  if p_at is null or p_at < now() + interval '1 minute' then
    raise exception 'Pick a time in the future';
  end if;
  if v_post.approved_hash is distinct from public.post_content_hash(v_post.title, v_post.body, v_post.cards) then
    raise exception 'The post changed after approval. Approve it again.';
  end if;

  update public.posts
    set status = 'scheduled', scheduled_for = p_at,
        publish_state = null, publish_error = null, publish_attempts = 0, publish_retryable = true, next_attempt_at = null
    where id = v_post.id
    returning * into v_post;

  perform public.log_post_event(v_post, 'scheduled', jsonb_build_object('scheduled_for', p_at));
  return v_post;
end;
$$;

-- Approved or scheduled, go out now.
create function public.publish_now(p_post_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  v_post := public.own_post_for_update(p_post_id);
  perform public.assert_not_publishing(v_post);

  if v_post.status not in ('approved', 'scheduled') then
    raise exception 'Approve the post before publishing it';
  end if;
  if v_post.approved_hash is distinct from public.post_content_hash(v_post.title, v_post.body, v_post.cards) then
    raise exception 'The post changed after approval. Approve it again.';
  end if;

  update public.posts
    set status = 'scheduled', scheduled_for = now(),
        publish_state = null, publish_error = null, publish_attempts = 0, publish_retryable = true, next_attempt_at = null
    where id = v_post.id
    returning * into v_post;

  perform public.log_post_event(v_post, 'publish_requested', jsonb_build_object('when', 'now'));
  return v_post;
end;
$$;

-- After a failure the lawyer has looked into.
create function public.retry_publish(p_post_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  v_post := public.own_post_for_update(p_post_id);

  if v_post.status <> 'scheduled' or v_post.publish_state is distinct from 'failed' then
    raise exception 'There is nothing to retry';
  end if;

  update public.posts
    set publish_state = null, publish_error = null, publish_attempts = 0, publish_retryable = true,
        next_attempt_at = null, scheduled_for = least(scheduled_for, now())
    where id = v_post.id
    returning * into v_post;

  perform public.log_post_event(v_post, 'publish_requested', jsonb_build_object('when', 'retry'));
  return v_post;
end;
$$;

create or replace function public.unschedule_post(p_post_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  v_post := public.own_post_for_update(p_post_id);
  perform public.assert_not_publishing(v_post);

  if v_post.status <> 'scheduled' then
    raise exception 'This post is not scheduled';
  end if;

  update public.posts
    set status = 'approved', scheduled_for = null,
        publish_state = null, publish_error = null, publish_attempts = 0, next_attempt_at = null
    where id = v_post.id
    returning * into v_post;

  perform public.log_post_event(v_post, 'unscheduled');
  return v_post;
end;
$$;

create or replace function public.mark_posted(p_post_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  v_post := public.own_post_for_update(p_post_id);
  perform public.assert_not_publishing(v_post);

  if v_post.status not in ('approved', 'scheduled') then
    raise exception 'Only approved posts can be marked as posted';
  end if;
  if v_post.approved_hash is distinct from public.post_content_hash(v_post.title, v_post.body, v_post.cards) then
    raise exception 'The post changed after approval. Approve it again.';
  end if;

  update public.posts
    set status = 'posted', posted_at = now(), published_via = 'manual',
        publish_state = null, publish_error = null, next_attempt_at = null
    where id = v_post.id
    returning * into v_post;

  perform public.log_post_event(v_post, 'marked_posted', jsonb_build_object('how', 'manual'));
  return v_post;
end;
$$;

create or replace function public.return_to_review(p_post_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  v_post := public.own_post_for_update(p_post_id);
  perform public.assert_not_publishing(v_post);

  if v_post.status not in ('approved', 'scheduled') then
    raise exception 'This post is already in review';
  end if;

  update public.posts
    set status = 'to_review', approved_at = null, approved_by = null, approved_hash = null, scheduled_for = null,
        publish_state = null, publish_error = null, publish_attempts = 0, next_attempt_at = null
    where id = v_post.id
    returning * into v_post;

  perform public.log_post_event(v_post, 'approval_revoked', jsonb_build_object('reason', 'withdrawn'));
  return v_post;
end;
$$;

revoke execute on function public.publish_now(uuid) from public, anon;
revoke execute on function public.retry_publish(uuid) from public, anon;
grant execute on function public.publish_now(uuid) to authenticated;
grant execute on function public.retry_publish(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Publisher functions (service role only)
-- ---------------------------------------------------------------------------

create function public.claim_due_posts(p_limit integer default 10, p_post_id uuid default null)
returns setof public.posts
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A publish that never finished may already be live. Stop and ask.
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
      and p.channel in ('linkedin', 'facebook', 'instagram')
      and (p_post_id is null or p.id = p_post_id)
      and p.approved_hash = public.post_content_hash(p.title, p.body, p.cards)
      and (
        p.publish_state is null
        or (p.publish_state = 'failed' and p.publish_retryable and p.publish_attempts < 5
            and coalesce(p.next_attempt_at, now()) <= now())
      )
      and exists (
        select 1 from public.social_connections c
        where c.user_id = p.user_id and c.provider = p.channel and c.status = 'active' and c.token_ciphertext is not null
      )
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

create function public.complete_publish(p_post_id uuid, p_external_id text, p_external_url text)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  update public.posts
    set status = 'posted', posted_at = now(), published_via = 'junior',
        publish_state = null, publish_error = null, publishing_started_at = null, next_attempt_at = null,
        external_id = p_external_id, external_url = p_external_url
    where id = p_post_id and publish_state = 'publishing'
    returning * into v_post;
  if not found then
    raise exception 'Post % is not being published', p_post_id;
  end if;

  perform public.log_post_event(v_post, 'published', jsonb_build_object('external_id', p_external_id, 'url', p_external_url));
  return v_post;
end;
$$;

create function public.fail_publish(p_post_id uuid, p_error text, p_retryable boolean)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
  v_retry boolean;
begin
  select * into v_post from public.posts where id = p_post_id and publish_state = 'publishing' for update;
  if not found then
    raise exception 'Post % is not being published', p_post_id;
  end if;

  v_retry := coalesce(p_retryable, false) and v_post.publish_attempts < 5;

  update public.posts
    set publish_state = 'failed', publish_error = left(coalesce(p_error, 'Publishing failed'), 1000),
        publish_retryable = v_retry, publishing_started_at = null,
        -- 2, 4, 8, 16 minutes
        next_attempt_at = case when v_retry then now() + make_interval(mins => power(2, v_post.publish_attempts)::int) end
    where id = p_post_id
    returning * into v_post;

  perform public.log_post_event(v_post, 'publish_failed',
    jsonb_build_object('error', v_post.publish_error, 'attempt', v_post.publish_attempts, 'will_retry', v_retry));
  return v_post;
end;
$$;

revoke execute on function public.claim_due_posts(integer, uuid) from public, anon, authenticated;
revoke execute on function public.complete_publish(uuid, text, text) from public, anon, authenticated;
revoke execute on function public.fail_publish(uuid, text, boolean) from public, anon, authenticated;
grant execute on function public.claim_due_posts(integer, uuid) to service_role;
grant execute on function public.complete_publish(uuid, text, text) to service_role;
grant execute on function public.fail_publish(uuid, text, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Carousel images: rendered at publish time, private, shared by signed URL
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('carousel', 'carousel', false, 8388608, array['image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "carousel: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'carousel' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- ---------------------------------------------------------------------------
-- Every minute, wake the publisher if anything is due
-- ---------------------------------------------------------------------------
-- The app's URL and shared secret live in Supabase Vault:
--   select vault.create_secret('https://<app>/api/cron/publish', 'junior_publish_url');
--   select vault.create_secret('<CRON_SECRET>', 'junior_cron_secret');
-- Until both exist this does nothing.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create function public.wake_publisher()
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
    where status = 'scheduled' and scheduled_for <= now() and channel <> 'newsletter'
      and (publish_state is null or (publish_state = 'failed' and publish_retryable and coalesce(next_attempt_at, now()) <= now()))
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

revoke execute on function public.wake_publisher() from public, anon, authenticated;

select cron.schedule('junior-wake-publisher', '* * * * *', 'select public.wake_publisher()');
