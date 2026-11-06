-- Run with: npx supabase test db
-- The publishing rules: hidden tokens, one claim per post, approved text only.
begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

insert into auth.users (id, email, aud, role, instance_id)
values ('33333333-3333-4333-8333-333333333333', 'lim@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

-- Server-side setup: a LinkedIn connection and a brief with two posts.
insert into public.social_connections (user_id, provider, external_id, display_name, token_ciphertext)
values ('33333333-3333-4333-8333-333333333333', 'linkedin', 'abc123', 'Lim Mei Ling', 'v1.iv.tag.ciphertext');

insert into public.briefs (id, user_id, title, source_kind, source_text)
values ('bbbbbbbb-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'Deposits', 'text', 'Source.');

insert into public.posts (id, user_id, brief_id, channel, body, checks, rule_checks)
values
  ('cccccccc-0000-4000-8000-000000000001', '33333333-3333-4333-8333-333333333333', 'bbbbbbbb-0000-4000-8000-000000000001', 'linkedin', 'LinkedIn text.', '[]', '[]'),
  ('cccccccc-0000-4000-8000-000000000002', '33333333-3333-4333-8333-333333333333', 'bbbbbbbb-0000-4000-8000-000000000001', 'facebook', 'Facebook text.', '[]', '[]');

-- Lawyer approves both and asks for them now.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","email":"lim@example.com","role":"authenticated"}', true);

select throws_ok($$ select token_ciphertext from public.social_connections $$, '42501', null, 'tokens are not readable by users');
select is((select display_name from public.social_connections where provider = 'linkedin'), 'Lim Mei Ling', 'connection details are readable');
select throws_ok(
  $$ insert into public.social_connections (user_id, provider) values ('33333333-3333-4333-8333-333333333333', 'facebook') $$,
  '42501', null, 'users cannot write connections directly'
);
select throws_ok($$ select * from public.claim_due_posts(10, null) $$, '42501', null, 'users cannot run the publisher');

select lives_ok($$ select public.approve_post('cccccccc-0000-4000-8000-000000000001') $$, 'approve LinkedIn');
select lives_ok($$ select public.approve_post('cccccccc-0000-4000-8000-000000000002') $$, 'approve Facebook');
select lives_ok($$ select public.publish_now('cccccccc-0000-4000-8000-000000000001') $$, 'publish LinkedIn now');
select lives_ok($$ select public.publish_now('cccccccc-0000-4000-8000-000000000002') $$, 'publish Facebook now');

-- The publisher
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

select is(
  (select array_agg(id::text) from public.claim_due_posts(10, null)),
  array['cccccccc-0000-4000-8000-000000000001'],
  'only the post with an active connection is claimed'
);
select is((select count(*)::int from public.claim_due_posts(10, null)), 0, 'a claimed post is not claimed twice');
select is((select publish_state from public.posts where id = 'cccccccc-0000-4000-8000-000000000001'), 'publishing', 'post is marked as publishing');

-- While publishing, the lawyer cannot change it.
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-4333-8333-333333333333","email":"lim@example.com","role":"authenticated"}', true);
select throws_ok(
  $$ update public.posts set body = 'Changed' where id = 'cccccccc-0000-4000-8000-000000000001' $$,
  'P0001', 'Junior is publishing this post right now. Wait a moment, then try again.', 'no edits mid-publish'
);
select throws_ok(
  $$ select public.unschedule_post('cccccccc-0000-4000-8000-000000000001') $$,
  'P0001', 'Junior is publishing this post right now. Wait a moment, then try again.', 'no unscheduling mid-publish'
);

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

-- A retryable failure waits for its back-off.
select lives_ok($$ select public.fail_publish('cccccccc-0000-4000-8000-000000000001', 'LinkedIn is busy', true) $$, 'record a retryable failure');
select is((select count(*)::int from public.claim_due_posts(10, null)), 0, 'not retried before the back-off');
reset role;
update public.posts set next_attempt_at = now() - interval '1 second' where id = 'cccccccc-0000-4000-8000-000000000001';
set local role service_role;
select is((select count(*)::int from public.claim_due_posts(10, null)), 1, 'retried after the back-off');

select lives_ok(
  $$ select public.complete_publish('cccccccc-0000-4000-8000-000000000001', 'urn:li:share:1', 'https://www.linkedin.com/feed/update/urn:li:share:1/') $$,
  'record success'
);
select is(
  (select status || '|' || published_via || '|' || external_url from public.posts where id = 'cccccccc-0000-4000-8000-000000000001'),
  'posted|junior|https://www.linkedin.com/feed/update/urn:li:share:1/',
  'post is posted with its link'
);
select is(
  (select actor_email from public.approval_log where action = 'published' and post_id = 'cccccccc-0000-4000-8000-000000000001'),
  'Junior publisher',
  'the log says Junior published it'
);

-- Text that no longer matches the approval is never published.
reset role;
insert into public.social_connections (user_id, provider, external_id, display_name, token_ciphertext)
values ('33333333-3333-4333-8333-333333333333', 'facebook', 'page1', 'Lim & Co', 'v1.iv.tag.ciphertext');
update public.posts set approved_hash = 'tampered' where id = 'cccccccc-0000-4000-8000-000000000002';
set local role service_role;
select is((select count(*)::int from public.claim_due_posts(10, null)), 0, 'a post whose approval does not match is skipped');

-- A publish that never finished is not retried automatically.
reset role;
update public.posts
  set approved_hash = public.post_content_hash(title, body, cards), publish_state = 'publishing',
      publishing_started_at = now() - interval '20 minutes'
  where id = 'cccccccc-0000-4000-8000-000000000002';
set local role service_role;
select is((select count(*)::int from public.claim_due_posts(10, null)), 0, 'a stuck publish is not retried');
select is(
  (select publish_state || '|' || publish_retryable::text from public.posts where id = 'cccccccc-0000-4000-8000-000000000002'),
  'failed|false',
  'a stuck publish waits for the lawyer'
);

select * from finish();
rollback;
