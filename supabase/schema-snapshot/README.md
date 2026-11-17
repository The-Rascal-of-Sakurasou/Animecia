# ANIXIA live schema snapshot

Exported read-only from Supabase project `trvnxggqzlhqdhoyiliy` on 2026-11-17.

## Files
- `01_tables_and_constraints.sql`: schemas, required extensions, enums, tables, constraints.
- `02_indexes_and_rls.sql`: standalone indexes and RLS enablement.
- `03_policies.sql`: RLS policies.
- `04_functions_and_triggers.sql`: application functions and custom triggers, including triggers on `auth` tables.
- `05_grants.sql`: observed table and function grants for Supabase API roles.

## Limitations
This is a **schema snapshot**, not a replacement migration chain. Do not place these files in `supabase/migrations` or apply them to production. It excludes all table rows, Auth users, user data, passwords, API keys, Vault contents, cron job definitions, platform-managed schemas, and extension-owned objects. The Wikidata cron schedule and secret must be provisioned separately using the reviewed migration flow. Verify this snapshot in a disposable local Supabase environment before treating it as a fresh-project bootstrap.

Live catalog counts: 47 tables, 172 constraints, 55 standalone indexes, 69 RLS policies, 20 functions, 11 custom triggers.
