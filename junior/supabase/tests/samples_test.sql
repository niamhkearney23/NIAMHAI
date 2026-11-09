-- Run with: npx supabase test db
-- The free sample: private to the server, one draft per person, one winner per
-- claim, and housekeeping that deletes what it should.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into public.sample_requests (id, email, email_key, token, jurisdiction, source_text)
values ('aaaaaaaa-1000-4000-8000-000000000001', 'anna@example.com', 'anna@example.com', repeat('a', 48), 'MY', 'Source text.');

-- Nobody but the server can see or change samples.
set local role anon;
select throws_ok($$ select * from public.sample_requests $$, '42501', null, 'a visitor cannot read samples');
select throws_ok(
  $$ insert into public.sample_requests (email, email_key, token, jurisdiction) values ('x@example.com', 'x@example.com', repeat('c', 48), 'MY') $$,
  '42501', null, 'a visitor cannot write samples directly'
);
reset role;

insert into auth.users (id, email, aud, role, instance_id)
values ('66666666-6666-4666-8666-666666666666', 'lawyer@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated"}', true);
select throws_ok($$ select * from public.sample_requests $$, '42501', null, 'a signed-in lawyer cannot read other people''s samples');
select throws_ok($$ select * from public.claim_sample(repeat('a', 48)) $$, '42501', null, 'only the server can claim a sample');
select throws_ok($$ select public.purge_samples() $$, '42501', null, 'only the server can run the cleanup');
reset role;

-- Shape of the data.
select throws_ok(
  $$ insert into public.sample_requests (email, email_key, token, jurisdiction) values ('anna2@example.com', 'anna@example.com', repeat('d', 48), 'MY') $$,
  '23505', null, 'one sample per person, however the address is written'
);
select throws_ok(
  $$ insert into public.sample_requests (email, email_key, token, jurisdiction) values ('b@example.com', 'b@example.com', 'short', 'MY') $$,
  '23514', null, 'a link token must be 48 hex characters'
);

-- Claiming.
select is((select count(*)::int from public.claim_sample(repeat('a', 48))), 1, 'the first claim wins');
select is((select count(*)::int from public.claim_sample(repeat('a', 48))), 0, 'a second claim while it is being written gets nothing');
select is((select attempts from public.sample_requests where token = repeat('a', 48)), 1, 'the attempt is counted');

update public.sample_requests set status = 'failed' where token = repeat('a', 48);
select is((select count(*)::int from public.claim_sample(repeat('a', 48))), 1, 'a failed draft can be tried again');

-- A run that died part-way is taken over after 6 minutes. The touch trigger
-- would reset the clock, so switch triggers off to age the row.
set local session_replication_role = replica;
update public.sample_requests set updated_at = now() - interval '7 minutes' where token = repeat('a', 48);
set local session_replication_role = origin;
select is((select count(*)::int from public.claim_sample(repeat('a', 48))), 1, 'a stalled run is taken over');

update public.sample_requests set status = 'failed' where token = repeat('a', 48);
select is((select count(*)::int from public.claim_sample(repeat('a', 48))), 0, 'three tries is the limit');

insert into public.sample_requests (email, email_key, token, jurisdiction, source_text, status)
values ('done@example.com', 'done@example.com', repeat('e', 48), 'MY', null, 'pending');
select is((select count(*)::int from public.claim_sample(repeat('e', 48))), 0, 'nothing to draft from means nothing to claim');

-- Housekeeping.
insert into public.sample_requests (email, email_key, token, jurisdiction, source_text, status, draft, drafted_at, follow_up_ok, created_at)
values
  ('old-pending@example.com', 'old-pending@example.com', repeat('1', 48), 'MY', 'Text.', 'pending', null, null, false, now() - interval '4 days'),
  ('keep@example.com', 'keep@example.com', repeat('2', 48), 'MY', null, 'drafted', '{"body":"x"}', now() - interval '40 days', true, now() - interval '40 days'),
  ('gone@example.com', 'gone@example.com', repeat('3', 48), 'MY', null, 'drafted', '{"body":"x"}', now() - interval '100 days', false, now() - interval '100 days'),
  ('fresh@example.com', 'fresh@example.com', repeat('4', 48), 'MY', null, 'drafted', '{"body":"x"}', now() - interval '2 days', false, now() - interval '2 days');
select public.purge_samples();
select is((select count(*)::int from public.sample_requests where token = repeat('1', 48)), 0, 'a request nobody finished is deleted after 3 days');
select is(
  (select (draft is null)::text || '/' || count(*)::text from public.sample_requests where token = repeat('2', 48) group by draft),
  'true/1', 'a draft is wiped after 30 days, and the person kept if they agreed to hear from us'
);
select is((select count(*)::int from public.sample_requests where token = repeat('3', 48)), 0, 'someone who did not agree to hear from us is forgotten after 90 days');
select is((select draft is not null from public.sample_requests where token = repeat('4', 48)), true, 'a recent draft is kept');

select * from finish();
rollback;
