-- Cascade linkage: let a goal optionally point at a higher-level goal it serves.
-- Idempotent. schema.sql already declares parent_id for fresh installs; this backfills
-- existing databases where migration 0001 did not add the column.
alter table goals
  add column if not exists parent_id uuid references goals(id) on delete set null;
