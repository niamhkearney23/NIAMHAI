-- Run with: npx supabase test db
-- Proves the approval rules hold in the database, whatever the app does.
begin;
create extension if not exists pgtap with schema extensions;
select plan(24);

-- Two lawyers
insert into auth.users (id, email, aud, role, instance_id)
values
  ('11111111-1111-4111-8111-111111111111', 'aisyah@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
  ('22222222-2222-4222-8222-222222222222', 'wei@example.com', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');

select is((select count(*)::int from public.profiles where id in ('11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222')), 2, 'a profile is created for each new user');

-- Act as Aisyah
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-4111-8111-111111111111","email":"aisyah@example.com","role":"authenticated"}', true);

insert into public.briefs (id, title, source_kind, source_text)
values ('aaaaaaaa-0000-4000-8000-000000000001', 'Probation clauses', 'text', 'Source text about probation clauses.');

insert into public.posts (brief_id, channel, body, checks, rule_checks)
values (
  'aaaaaaaa-0000-4000-8000-000000000001', 'linkedin', 'On [date] the court ruled.',
  '[{"key":"junior:0","item":"Facts match","pass":false,"note":"Inferred one point."},{"key":"junior:1","item":"Style","pass":true,"note":"Fine."}]',
  '[{"key":"rule:placeholders","item":"No placeholders left","pass":false,"note":"Fill in [date].","blocking":true}]'
);

create temporary table t_post as select id from public.posts where brief_id = 'aaaaaaaa-0000-4000-8000-000000000001';
grant select on t_post to authenticated;

select throws_ok(
  $$ update public.posts set status = 'approved' where id = (select id from t_post) $$,
  '42501', null, 'status cannot be changed directly'
);

select throws_ok(
  $$ insert into public.approval_log (user_id, action) values ('11111111-1111-4111-8111-111111111111', 'approved') $$,
  '42501', null, 'the approval log cannot be written directly'
);

select throws_ok(
  $$ select public.approve_post((select id from t_post)) $$,
  'P0001', 'Tick off or fix every failed check before approving', 'approval is blocked by failed checks'
);

select throws_ok(
  $$ select public.set_check_ack((select id from t_post), 'rule:placeholders', true) $$,
  'P0001', 'This check has to be fixed in the text before approval', 'blocking checks cannot be ticked off'
);

-- Fix the text, tick off Junior's flagged check
update public.posts
  set body = 'On 3 March the court ruled.',
      rule_checks = '[{"key":"rule:placeholders","item":"No placeholders left","pass":true,"note":"Done."}]'
  where id = (select id from t_post);

select lives_ok($$ select public.set_check_ack((select id from t_post), 'junior:0', true) $$, 'a flagged check can be ticked off');
select lives_ok($$ select public.approve_post((select id from t_post)) $$, 'approval succeeds once checks are dealt with');

select is((select status from public.posts where id = (select id from t_post)), 'approved', 'post is approved');
select is((select approved_by from public.posts where id = (select id from t_post)), '11111111-1111-4111-8111-111111111111'::uuid, 'approver is recorded');

select is(
  (select actor_email || '|' || (content_snapshot ->> 'body') from public.approval_log where action = 'approved' and post_id = (select id from t_post)),
  'aisyah@example.com|On 3 March the court ruled.',
  'the log keeps who approved and exactly what'
);

select is(
  (select jsonb_array_length(detail -> 'ticked_off_checks') from public.approval_log where action = 'approved' and post_id = (select id from t_post)),
  1,
  'the log lists the checks that were ticked off'
);

-- Editing withdraws approval
update public.posts set body = 'On 3 March 2026 the court ruled.' where id = (select id from t_post);
select is((select status from public.posts where id = (select id from t_post)), 'to_review', 'editing approved text sends it back to review');
select is(
  (select count(*)::int from public.approval_log where action = 'approval_revoked' and post_id = (select id from t_post)),
  1,
  'the withdrawal is logged'
);

select throws_ok(
  $$ select public.schedule_post((select id from t_post), now() + interval '1 day') $$,
  'P0001', 'Approve the post before scheduling it', 'cannot schedule without approval'
);

select lives_ok($$ select public.approve_post((select id from t_post)) $$, 'can approve again');

select throws_ok(
  $$ select public.schedule_post((select id from t_post), now() - interval '1 hour') $$,
  'P0001', 'Pick a time in the future', 'cannot schedule in the past'
);

select lives_ok($$ select public.schedule_post((select id from t_post), now() + interval '1 day') $$, 'can schedule an approved post');
select is((select status from public.posts where id = (select id from t_post)), 'scheduled', 'post is scheduled');

select lives_ok($$ select public.mark_posted((select id from t_post)) $$, 'can mark a scheduled post as posted');
select throws_ok(
  $$ update public.posts set body = 'Changed after posting' where id = (select id from t_post) $$,
  'P0001', 'This post has already gone out and cannot be edited', 'posted content is locked'
);

select throws_ok(
  $$ update public.approval_log set actor_email = 'someone@else.com' $$,
  '42501', null, 'log entries cannot be edited'
);

-- Act as Wei: cannot see or touch Aisyah's work
select set_config('request.jwt.claims', '{"sub":"22222222-2222-4222-8222-222222222222","email":"wei@example.com","role":"authenticated"}', true);

select is((select count(*)::int from public.posts), 0, 'another lawyer sees no posts');
select is((select count(*)::int from public.approval_log), 0, 'another lawyer sees no log entries');
select throws_ok(
  $$ select public.return_to_review((select id from t_post)) $$,
  'P0002', 'Post not found', 'another lawyer cannot act on the post'
);

select * from finish();
rollback;
