-- Migration 0013: lock down direct REST access. Idempotent — safe to re-run.
-- Paste the CONTENTS into the Supabase SQL editor and run.
--
-- WHY (critical): the browser ships NEXT_PUBLIC_SUPABASE_ANON_KEY. With RLS
-- OFF, that public key can hit the Supabase REST API directly and read/write
-- EVERY table for EVERY user (password hashes, emails, journals, API keys).
--
-- FIX: turn RLS on for every table and add NO policies. The public roles
-- (anon, authenticated) then get zero rows. All app code uses the
-- service_role key, which BYPASSES RLS, so the app keeps working unchanged.
-- Also revoke table/sequence grants from the public roles as a second layer.

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t.tablename);
  end loop;
end $$;

-- Belt and suspenders: strip privileges from the browser-facing roles.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
