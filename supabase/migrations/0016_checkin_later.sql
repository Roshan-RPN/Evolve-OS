-- Allow a fourth check-in response: "later" (going to do it later, e.g. this evening).
alter table checkins drop constraint if exists checkins_response_check;
alter table checkins
  add constraint checkins_response_check
  check (response in ('done', 'partial', 'skipped', 'later'));
