-- 0012: email is now the login identifier, so it must be unique (case-insensitive).
-- Emails are stored lowercased by the app; this index enforces no duplicates.
-- Paste into the Supabase SQL editor (Dashboard → SQL Editor → New query) and Run.
create unique index if not exists app_users_email_unique
  on app_users (lower(email))
  where email is not null;
