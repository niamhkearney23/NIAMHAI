-- Junior, phase 1: profiles, briefs, posts, approval log, uploads bucket.
--
-- Design notes
-- * Every table is owned by one user and protected by row level security.
-- * Lawyers edit post content directly. Workflow changes (approve, schedule,
--   mark posted, tick off a check) go through the security definer functions
--   below, so the rules live in the database and cannot be skipped.
-- * Editing approved content sends the post back to "to review" and records
--   that in the approval log. Nothing stays approved after it changes.
-- * The approval log is append only: users can read their own rows but cannot
--   insert, update or delete them directly.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 120),
  firm text not null default '' check (char_length(firm) <= 160),
  jurisdiction text not null default 'MY' check (jurisdiction in ('MY', 'SG', 'BOTH')),
  practice_areas text[] not null default '{}' check (cardinality(practice_areas) <= 12),
  voice_samples text[] not null default '{}' check (cardinality(voice_samples) <= 3),
  timezone text not null default 'Asia/Kuala_Lumpur'
    check (timezone in ('Asia/Kuala_Lumpur', 'Asia/Singapore')),
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profiles: insert own" on public.profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profiles: update own" on public.profiles
  for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

-- Create an empty profile row when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Briefs: the source material a lawyer gives Junior
-- ---------------------------------------------------------------------------

create table public.briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null default '' check (char_length(title) <= 200),
  source_kind text not null check (source_kind in ('text', 'pdf', 'audio')),
  source_name text check (char_length(source_name) <= 255),
  source_text text not null check (char_length(source_text) between 1 and 200000),
  redactions integer not null default 0 check (redactions >= 0),
  pii_kept boolean not null default false,
  drafted_with text not null default '',
  created_at timestamptz not null default now()
);

create index briefs_user_created_idx on public.briefs (user_id, created_at desc);

alter table public.briefs enable row level security;

create policy "briefs: read own" on public.briefs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "briefs: insert own" on public.briefs
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "briefs: delete own" on public.briefs
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Posts: one draft per channel per brief
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  brief_id uuid not null references public.briefs (id) on delete cascade,
  channel text not null check (channel in ('linkedin', 'instagram', 'facebook', 'newsletter')),
  status text not null default 'to_review'
    check (status in ('to_review', 'approved', 'scheduled', 'posted')),
  -- Newsletter subject line. Empty for other channels.
  title text not null default '' check (char_length(title) <= 300),
  -- Post text, Instagram caption or newsletter body.
  body text not null default '' check (char_length(body) <= 20000),
  -- Instagram carousel cards: [{ "heading": "...", "body": "..." }]
  cards jsonb not null default '[]'::jsonb check (jsonb_typeof(cards) = 'array'),
  -- Junior's own checks: [{ "key", "item", "pass", "note" }]
  checks jsonb not null default '[]'::jsonb check (jsonb_typeof(checks) = 'array'),
  -- House rule checks, recomputed by the app on every save:
  -- [{ "key", "item", "pass", "note", "blocking" }]
  rule_checks jsonb not null default '[]'::jsonb check (jsonb_typeof(rule_checks) = 'array'),
  -- Failed checks the lawyer has ticked off: { "<key>": { "at": "...", "by": "<uuid>" } }
  check_acks jsonb not null default '{}'::jsonb check (jsonb_typeof(check_acks) = 'object'),
  scheduled_for timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users (id) on delete set null,
  approved_hash text,
  posted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brief_id, channel)
);

create index posts_user_status_idx on public.posts (user_id, status);
create index posts_user_scheduled_idx on public.posts (user_id, scheduled_for);

alter table public.posts enable row level security;

create policy "posts: read own" on public.posts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "posts: insert own" on public.posts
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and status = 'to_review'
    and exists (select 1 from public.briefs b where b.id = brief_id and b.user_id = (select auth.uid()))
  );
create policy "posts: update own" on public.posts
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "posts: delete own" on public.posts
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Lawyers may only edit content columns directly. Status, approval and
-- acknowledgement columns change through the workflow functions below.
revoke insert, update on public.posts from authenticated, anon;
grant insert (brief_id, channel, title, body, cards, checks, rule_checks) on public.posts to authenticated;
grant update (title, body, cards, rule_checks) on public.posts to authenticated;

revoke insert on public.briefs from anon;
revoke update on public.briefs from authenticated, anon;

-- A stable fingerprint of what the reader will see.
create function public.post_content_hash(p_title text, p_body text, p_cards jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(coalesce(p_title, '') || E'\x1f' || coalesce(p_body, '') || E'\x1f' || coalesce(p_cards, '[]'::jsonb)::text, 'sha256'),
    'hex'
  );
$$;

-- ---------------------------------------------------------------------------
-- Approval log: append only
-- ---------------------------------------------------------------------------

create table public.approval_log (
  id bigint generated always as identity primary key,
  post_id uuid references public.posts (id) on delete set null,
  user_id uuid not null references auth.users (id) on delete cascade,
  actor_email text not null default '',
  action text not null check (action in (
    'approved', 'approval_revoked', 'scheduled', 'unscheduled', 'marked_posted',
    'check_ticked', 'check_unticked'
  )),
  channel text,
  content_hash text,
  -- Exactly what was approved, so the record survives later edits.
  content_snapshot jsonb,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index approval_log_user_idx on public.approval_log (user_id, created_at desc);
create index approval_log_post_idx on public.approval_log (post_id, created_at desc);

alter table public.approval_log enable row level security;

create policy "approval log: read own" on public.approval_log
  for select to authenticated using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.approval_log from authenticated, anon;

create function public.approval_log_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  -- post_id is cleared when a post is deleted; nothing else may change.
  if tg_op = 'UPDATE'
     and new.id = old.id
     and new.user_id = old.user_id
     and new.action = old.action
     and new.created_at = old.created_at
     and new.content_hash is not distinct from old.content_hash
     and new.content_snapshot is not distinct from old.content_snapshot
     and new.detail = old.detail
     and new.post_id is null then
    return new;
  end if;
  raise exception 'The approval log cannot be changed';
end;
$$;

create trigger approval_log_no_update
  before update on public.approval_log
  for each row execute function public.approval_log_immutable();

create function public.log_post_event(p_post public.posts, p_action text, p_detail jsonb default '{}'::jsonb)
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
    coalesce(auth.jwt() ->> 'email', ''),
    p_action,
    p_post.channel,
    public.post_content_hash(p_post.title, p_post.body, p_post.cards),
    case when p_action = 'approved'
      then jsonb_build_object('title', p_post.title, 'body', p_post.body, 'cards', p_post.cards)
      else null end,
    coalesce(p_detail, '{}'::jsonb)
  );
end;
$$;

revoke execute on function public.log_post_event(public.posts, text, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Keep posts honest
-- ---------------------------------------------------------------------------

create function public.posts_before_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();

  -- Changing the words after approval withdraws the approval.
  if (new.title, new.body, new.cards) is distinct from (old.title, old.body, old.cards)
     and old.status in ('approved', 'scheduled') then
    new.status := 'to_review';
    new.approved_at := null;
    new.approved_by := null;
    new.approved_hash := null;
    perform public.log_post_event(new, 'approval_revoked', jsonb_build_object('reason', 'content edited'));
  end if;

  -- Posted content is a record of what went out.
  if old.status = 'posted'
     and (new.title, new.body, new.cards) is distinct from (old.title, old.body, old.cards) then
    raise exception 'This post has already gone out and cannot be edited';
  end if;

  return new;
end;
$$;

create trigger posts_before_update
  before update on public.posts
  for each row execute function public.posts_before_update();

-- ---------------------------------------------------------------------------
-- Workflow functions
-- ---------------------------------------------------------------------------

-- Load a post the caller owns, locked for update.
create function public.own_post_for_update(p_post_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  if auth.uid() is null then
    raise exception 'Not signed in' using errcode = '28000';
  end if;
  select * into v_post from public.posts where id = p_post_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Post not found' using errcode = 'P0002';
  end if;
  return v_post;
end;
$$;

revoke execute on function public.own_post_for_update(uuid) from public, anon, authenticated;

-- Failed checks that still stop approval.
create function public.post_open_checks(p_post public.posts)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(c), '[]'::jsonb)
  from jsonb_array_elements(p_post.checks || p_post.rule_checks) as c
  where coalesce((c ->> 'pass')::boolean, false) = false
    and (
      coalesce((c ->> 'blocking')::boolean, false)
      or not (p_post.check_acks ? (c ->> 'key'))
    );
$$;

create function public.set_check_ack(p_post_id uuid, p_key text, p_ticked boolean)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
  v_check jsonb;
begin
  v_post := public.own_post_for_update(p_post_id);

  if v_post.status <> 'to_review' then
    raise exception 'Checks can only be ticked off while a post is in review';
  end if;

  select c into v_check
  from jsonb_array_elements(v_post.checks || v_post.rule_checks) as c
  where c ->> 'key' = p_key
  limit 1;

  if v_check is null then
    raise exception 'Unknown check';
  end if;
  if coalesce((v_check ->> 'blocking')::boolean, false) and p_ticked then
    raise exception 'This check has to be fixed in the text before approval';
  end if;

  if p_ticked then
    update public.posts
      set check_acks = check_acks || jsonb_build_object(p_key, jsonb_build_object('at', now(), 'by', auth.uid()))
      where id = v_post.id
      returning * into v_post;
  else
    update public.posts
      set check_acks = check_acks - p_key
      where id = v_post.id
      returning * into v_post;
  end if;

  perform public.log_post_event(
    v_post,
    case when p_ticked then 'check_ticked' else 'check_unticked' end,
    jsonb_build_object('check', v_check)
  );
  return v_post;
end;
$$;

create function public.approve_post(p_post_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
  v_open jsonb;
  v_ticked jsonb;
begin
  v_post := public.own_post_for_update(p_post_id);

  if v_post.status <> 'to_review' then
    raise exception 'Only posts in review can be approved';
  end if;
  if btrim(v_post.body) = '' then
    raise exception 'There is nothing to approve yet';
  end if;

  v_open := public.post_open_checks(v_post);
  if jsonb_array_length(v_open) > 0 then
    raise exception 'Tick off or fix every failed check before approving'
      using detail = v_open::text;
  end if;

  select coalesce(jsonb_agg(c), '[]'::jsonb) into v_ticked
  from jsonb_array_elements(v_post.checks || v_post.rule_checks) as c
  where coalesce((c ->> 'pass')::boolean, false) = false;

  update public.posts
    set status = 'approved',
        approved_at = now(),
        approved_by = auth.uid(),
        approved_hash = public.post_content_hash(title, body, cards)
    where id = v_post.id
    returning * into v_post;

  perform public.log_post_event(v_post, 'approved', jsonb_build_object('ticked_off_checks', v_ticked));
  return v_post;
end;
$$;

create function public.schedule_post(p_post_id uuid, p_at timestamptz)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  v_post := public.own_post_for_update(p_post_id);

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
    set status = 'scheduled', scheduled_for = p_at
    where id = v_post.id
    returning * into v_post;

  perform public.log_post_event(v_post, 'scheduled', jsonb_build_object('scheduled_for', p_at));
  return v_post;
end;
$$;

create function public.unschedule_post(p_post_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  v_post := public.own_post_for_update(p_post_id);

  if v_post.status <> 'scheduled' then
    raise exception 'This post is not scheduled';
  end if;

  update public.posts
    set status = 'approved', scheduled_for = null
    where id = v_post.id
    returning * into v_post;

  perform public.log_post_event(v_post, 'unscheduled');
  return v_post;
end;
$$;

-- Phase 1 has no auto-posting: the lawyer copies the text, posts it
-- themselves, then records that here.
create function public.mark_posted(p_post_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  v_post := public.own_post_for_update(p_post_id);

  if v_post.status not in ('approved', 'scheduled') then
    raise exception 'Only approved posts can be marked as posted';
  end if;
  if v_post.approved_hash is distinct from public.post_content_hash(v_post.title, v_post.body, v_post.cards) then
    raise exception 'The post changed after approval. Approve it again.';
  end if;

  update public.posts
    set status = 'posted', posted_at = now()
    where id = v_post.id
    returning * into v_post;

  perform public.log_post_event(v_post, 'marked_posted', jsonb_build_object('how', 'manual'));
  return v_post;
end;
$$;

-- Withdraw an approval without editing (for example, to rethink the timing).
create function public.return_to_review(p_post_id uuid)
returns public.posts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_post public.posts;
begin
  v_post := public.own_post_for_update(p_post_id);

  if v_post.status not in ('approved', 'scheduled') then
    raise exception 'This post is already in review';
  end if;

  update public.posts
    set status = 'to_review', approved_at = null, approved_by = null, approved_hash = null, scheduled_for = null
    where id = v_post.id
    returning * into v_post;

  perform public.log_post_event(v_post, 'approval_revoked', jsonb_build_object('reason', 'withdrawn'));
  return v_post;
end;
$$;

revoke execute on function public.set_check_ack(uuid, text, boolean) from public, anon;
revoke execute on function public.approve_post(uuid) from public, anon;
revoke execute on function public.schedule_post(uuid, timestamptz) from public, anon;
revoke execute on function public.unschedule_post(uuid) from public, anon;
revoke execute on function public.mark_posted(uuid) from public, anon;
revoke execute on function public.return_to_review(uuid) from public, anon;
grant execute on function public.set_check_ack(uuid, text, boolean) to authenticated;
grant execute on function public.approve_post(uuid) to authenticated;
grant execute on function public.schedule_post(uuid, timestamptz) to authenticated;
grant execute on function public.unschedule_post(uuid) to authenticated;
grant execute on function public.mark_posted(uuid) to authenticated;
grant execute on function public.return_to_review(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Uploads bucket: PDFs and voice notes, deleted once Junior has read them
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'uploads', 'uploads', false, 26214400,
  array[
    'application/pdf',
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac',
    'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/ogg', 'audio/opus', 'video/mp4', 'video/webm'
  ]
)
on conflict (id) do nothing;

create policy "uploads: insert own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "uploads: read own folder" on storage.objects
  for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "uploads: delete own folder" on storage.objects
  for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = (select auth.uid())::text);
