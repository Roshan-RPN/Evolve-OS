-- Per-profile AI model choice. Each user picks which Gemini model Leo runs on
-- (null = fall back to the app's GEMINI_MODEL env default).
alter table app_users add column if not exists gemini_model text;
