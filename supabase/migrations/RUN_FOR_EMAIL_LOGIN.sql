-- EMAIL + PASSWORD LOGIN: run this ONCE to enable it.
-- Dashboard → SQL Editor → New query → paste this whole file → Run.
-- Safe to re-run (every statement is idempotent).

-- 0009: the email column login looks accounts up by.
alter table app_users
  add column if not exists email text;

-- 0012: email is the login identifier, so it must be unique (case-insensitive).
create unique index if not exists app_users_email_unique
  on app_users (lower(email))
  where email is not null;
