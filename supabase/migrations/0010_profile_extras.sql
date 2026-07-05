-- Profile extras: preset avatar + per-profile Gemini API key
-- (each profile brings its own key so Leo runs on their own quota).
alter table app_users add column if not exists avatar text;
alter table app_users add column if not exists gemini_api_key text;
