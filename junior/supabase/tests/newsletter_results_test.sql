-- Run with: npx supabase test db
-- Newsletter consent, private sends and results, newsletter publishing.
begin;
create extension if not exists pgtap with schema extensions;
select plan(16);

insert into auth.users (id, email, aud, role, instance_id)
values
  ('44444444-4444-4444-8444-444444444444', 'tan@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('55555555-5555-4555-8555-555555555555', 'other@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

insert into public.briefs (id, user_id, title, source_kind, source_text)
values ('dddddddd-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', 'Deposits', 'text', 'Source.');
insert into public.posts (id, user_id, brief_id, channel, title, body, checks, rule_checks)
values ('eeeeeeee-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', 'dddddddd-0000-4000-8000-000000000001',
        'newsletter', 'Deposits explained', 'Newsletter body.', '[]', '[]');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","email":"tan@example.com","role":"authenticated"}', true);

-- Subscribers
select lives_ok(
  $$ insert into public.subscribers (email, name, status, consent_source, consent_note, consented_at)
     values ('reader@example.com', 'Reader', 'subscribed', 'import', 'Client update list, consent confirmed by the lawyer', now()) $$,
  'a lawyer can add a subscriber with a consent record'
);
select throws_ok(
  $$ insert into public.subscribers (email, status, consent_source) values ('READER@example.com', 'subscribed', 'manual') $$,
  '23505', null, 'the same email cannot be added twice'
);
select throws_ok(
  $$ insert into public.subscribers (email, status, consent_source) values ('fake@example.com', 'subscribed', 'signup') $$,
  '42501', null, 'a lawyer cannot claim someone signed up themselves'
);
select throws_ok($$ select token from public.subscribers $$, '42501', null, 'unsubscribe tokens are hidden from the lawyer');
select lives_ok($$ update public.subscribers set status = 'unsubscribed' where email = 'reader@example.com' $$, 'a lawyer can unsubscribe someone');
select isnt((select unsubscribed_at from public.subscribers where email = 'reader@example.com'), null, 'the time is recorded');
select throws_ok(
  $$ update public.subscribers set status = 'subscribed' where email = 'reader@example.com' $$,
  'P0001', 'Only the subscriber can sign up again after unsubscribing', 'a lawyer cannot resubscribe someone'
);

-- Results and enquiries
select throws_ok(
  $$ insert into public.post_enquiries (post_id, note) values ('eeeeeeee-0000-4000-8000-000000000001', 'Call about deposits') $$,
  '42501', null, 'enquiries can only be logged on posted posts'
);
select lives_ok(
  $$ insert into public.post_results (post_id, likes, comments, source) values ('eeeeeeee-0000-4000-8000-000000000001', 12, 3, 'manual') $$,
  'a lawyer can enter results by hand'
);
select throws_ok(
  $$ insert into public.newsletter_sends (post_id, user_id, email) values ('eeeeeeee-0000-4000-8000-000000000001', '44444444-4444-4444-8444-444444444444', 'x@example.com') $$,
  '42501', null, 'send records are written by the server only'
);

-- Another lawyer sees none of it
select set_config('request.jwt.claims', '{"sub":"55555555-5555-4555-8555-555555555555","email":"other@example.com","role":"authenticated"}', true);
select is((select count(*)::int from public.subscribers), 0, 'subscribers are private');
select is((select count(*)::int from public.post_results), 0, 'results are private');

-- Newsletter publishing waits until the newsletter is set up
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-8444-444444444444","email":"tan@example.com","role":"authenticated"}', true);
select lives_ok($$ select public.approve_post('eeeeeeee-0000-4000-8000-000000000001') $$, 'approve the newsletter');
select lives_ok($$ select public.publish_now('eeeeeeee-0000-4000-8000-000000000001') $$, 'ask to send it now');

reset role;
set local role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', true);
select is((select count(*)::int from public.claim_due_posts(10, null)), 0, 'not sent while the newsletter is switched off');
reset role;
update public.profiles set newsletter_enabled = true where id = '44444444-4444-4444-8444-444444444444';
set local role service_role;
select is((select count(*)::int from public.claim_due_posts(10, null)), 1, 'sent once the newsletter is switched on');

select * from finish();
rollback;
