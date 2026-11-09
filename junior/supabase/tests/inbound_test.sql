-- Run with: npx supabase test db
-- Inbound email: private to the server, matched by sender, one winner per claim.
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

insert into auth.users (id, email, email_confirmed_at, aud, role, instance_id)
values
  ('77777777-7777-4777-8777-777777777777', 'Lim@Example.com', now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('88888888-8888-4888-8888-888888888888', 'other@example.com', now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('99999999-9999-4999-8999-999999999999', 'unconfirmed@example.com', null, 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

-- Matching a sender to a lawyer.
select is(public.sender_to_user('lim@example.com'), '77777777-7777-4777-8777-777777777777'::uuid, 'a sender matches a lawyer whatever the case');
select is(public.sender_to_user('stranger@example.com'), null, 'a stranger matches nobody');
select is(public.sender_to_user('unconfirmed@example.com'), null, 'an address that never signed in matches nobody');

insert into public.inbound_messages (id, resend_email_id, user_id, sender, status)
values
  ('aaaaaaaa-2000-4000-8000-000000000001', 'em-1', '77777777-7777-4777-8777-777777777777', 'lim@example.com', 'received'),
  ('aaaaaaaa-2000-4000-8000-000000000002', 'em-2', '88888888-8888-4888-8888-888888888888', 'other@example.com', 'drafted'),
  ('aaaaaaaa-2000-4000-8000-000000000003', 'em-3', null, 'stranger@example.com', 'rejected');

select throws_ok(
  $$ insert into public.inbound_messages (resend_email_id, sender) values ('em-1', 'dup@example.com') $$,
  '23505', null, 'the same email is never queued twice'
);

-- Who can see what.
set local role anon;
select throws_ok($$ select * from public.inbound_messages $$, '42501', null, 'a visitor cannot read the inbox log');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"77777777-7777-4777-8777-777777777777","role":"authenticated"}', true);
select is((select count(*)::int from public.inbound_messages), 1, 'a lawyer sees only their own messages');
select throws_ok($$ select sender from public.inbound_messages $$, '42501', null, 'the sender column is not exposed');
select throws_ok($$ update public.inbound_messages set status = 'drafted' $$, '42501', null, 'a lawyer cannot change a message');
select throws_ok($$ insert into public.inbound_messages (resend_email_id, sender, user_id) values ('em-9', 'a@b.c', '77777777-7777-4777-8777-777777777777') $$, '42501', null, 'a lawyer cannot invent one');
select throws_ok($$ select * from public.claim_inbound() $$, '42501', null, 'only the server can claim work');
select throws_ok($$ select public.sender_to_user('lim@example.com') $$, '42501', null, 'only the server can look up senders');
reset role;

-- Claiming.
select is((select count(*)::int from public.claim_inbound('em-1')), 1, 'the first claim wins');
select is((select count(*)::int from public.claim_inbound('em-1')), 0, 'a second claim gets nothing while it is processing');
select is((select count(*)::int from public.claim_inbound('em-3')), 0, 'mail from strangers is never claimed');

update public.inbound_messages set status = 'failed', retryable = true, next_attempt_at = now() + interval '5 minutes' where resend_email_id = 'em-1';
select is((select count(*)::int from public.claim_inbound('em-1')), 0, 'a failed message waits for its retry time');
update public.inbound_messages set next_attempt_at = now() - interval '1 minute' where resend_email_id = 'em-1';
select is((select count(*)::int from public.claim_inbound('em-1')), 1, 'and is taken again once it is due');

update public.inbound_messages set status = 'failed', retryable = true, attempts = 4, next_attempt_at = null where resend_email_id = 'em-1';
select is((select count(*)::int from public.claim_inbound('em-1')), 0, 'four tries is the limit');

-- Housekeeping.
set local session_replication_role = replica;
update public.inbound_messages set received_at = now() - interval '8 days' where resend_email_id = 'em-3';
set local session_replication_role = origin;
select public.purge_inbound();
select is((select count(*)::int from public.inbound_messages where resend_email_id = 'em-3'), 0, 'mail from strangers is forgotten after a week');

select * from finish();
rollback;
