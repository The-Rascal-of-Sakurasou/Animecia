-- Schema-only snapshot; excludes production data and managed Supabase schemas.

create schema if not exists private;

create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "pg_net" with schema "public";

create extension if not exists "pgcrypto" with schema "extensions";

create extension if not exists "uuid-ossp" with schema "extensions";

do $$ begin create type "public"."anime_format" as enum ('tv', 'movie', 'ova', 'ona', 'special', 'other', 'web'); exception when duplicate_object then null; end $$;

do $$ begin create type "public"."watch_status" as enum ('plan_to_watch', 'watching', 'completed', 'on_hold', 'dropped'); exception when duplicate_object then null; end $$;

create table if not exists "private"."admin_users" (
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "private"."quiz_answer_keys" (
  question_id uuid NOT NULL,
  correct_choice_id uuid NOT NULL
);

create table if not exists "public"."achievements" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  code text NOT NULL,
  title text NOT NULL,
  description text,
  icon_url text,
  points integer DEFAULT 0 NOT NULL,
  is_active boolean DEFAULT true NOT NULL
);

create table if not exists "public"."anime" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  source text,
  source_id text,
  title text NOT NULL,
  title_ja text,
  synopsis text,
  format anime_format DEFAULT 'other'::anime_format NOT NULL,
  release_year integer,
  season text,
  episode_count integer,
  episode_duration_minutes integer,
  status text,
  official_url text,
  poster_url text,
  banner_url text,
  studio_id uuid,
  is_published boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  title_kana text,
  season_name text,
  season_name_text text,
  released_on date,
  released_on_about text,
  media_text text,
  official_site_url text,
  wikipedia_url text,
  twitter_username text,
  twitter_hashtag text,
  mal_anime_id text,
  syobocal_tid text,
  episodes_count integer,
  watchers_count integer,
  reviews_count integer,
  no_episodes boolean,
  source_synced_at timestamp with time zone,
  synopsis_en text,
  age_rating text,
  country_code text,
  poster_source text,
  poster_source_id text,
  poster_attribution text,
  poster_source_url text,
  poster_synced_at timestamp with time zone
);

create table if not exists "public"."anime_characters" (
  anime_id uuid NOT NULL,
  character_id uuid NOT NULL,
  role text
);

create table if not exists "public"."anime_external_ids" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  anime_id uuid NOT NULL,
  source text NOT NULL,
  external_id text NOT NULL,
  source_url text,
  is_primary boolean DEFAULT false NOT NULL,
  last_verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."anime_genres" (
  anime_id uuid NOT NULL,
  genre_id uuid NOT NULL
);

create table if not exists "public"."anime_organization_staff" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  anime_id uuid NOT NULL,
  organization_id uuid NOT NULL,
  role text NOT NULL,
  role_en text,
  display_order integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."anime_relations" (
  anime_id uuid NOT NULL,
  related_anime_id uuid NOT NULL,
  relation_type text NOT NULL,
  display_order integer DEFAULT 1 NOT NULL,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."anime_series" (
  anime_id uuid NOT NULL,
  series_id uuid NOT NULL,
  series_role text DEFAULT 'main'::text NOT NULL,
  display_order integer DEFAULT 1 NOT NULL
);

create table if not exists "public"."anime_staff" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  anime_id uuid NOT NULL,
  person_id uuid NOT NULL,
  role text NOT NULL,
  character_id uuid
);

create table if not exists "public"."anime_staff_external_ids" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  anime_staff_id uuid NOT NULL,
  source text NOT NULL,
  external_id text NOT NULL,
  source_url text,
  last_verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."anime_studios" (
  anime_id uuid NOT NULL,
  studio_id uuid NOT NULL,
  production_role text DEFAULT 'animation'::text NOT NULL,
  display_order integer DEFAULT 1 NOT NULL
);

create table if not exists "public"."anime_tags" (
  anime_id uuid NOT NULL,
  tag_id uuid NOT NULL
);

create table if not exists "public"."anime_titles" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  anime_id uuid NOT NULL,
  title text NOT NULL,
  language_code text DEFAULT 'ja'::text NOT NULL,
  title_type text DEFAULT 'synonym'::text NOT NULL,
  is_primary boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."announcements" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  is_published boolean DEFAULT false NOT NULL,
  published_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."catalog_entity_aliases" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  alias text NOT NULL,
  language_code text,
  alias_type text DEFAULT 'alternate_name'::text NOT NULL,
  source_entity_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."catalog_entity_merge_log" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  entity_type text NOT NULL,
  source_entity_id uuid NOT NULL,
  target_entity_id uuid NOT NULL,
  merged_by uuid,
  details jsonb DEFAULT '{}'::jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."catalog_sources" (
  code text NOT NULL,
  display_name text NOT NULL,
  website_url text,
  api_docs_url text,
  terms_url text,
  rights_review_status text DEFAULT 'pending'::text NOT NULL,
  rights_reviewed_at timestamp with time zone,
  rights_notes text,
  is_enabled boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."catalog_sync_runs" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  source text NOT NULL,
  started_at timestamp with time zone DEFAULT now() NOT NULL,
  finished_at timestamp with time zone,
  status text NOT NULL,
  pages_requested integer DEFAULT 0 NOT NULL,
  records_seen integer DEFAULT 0 NOT NULL,
  records_inserted_or_updated integer DEFAULT 0 NOT NULL,
  error_message text
);

create table if not exists "public"."catalog_sync_secrets" (
  id smallint DEFAULT 1 NOT NULL,
  secret_hash text NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."catalog_sync_state" (
  source text NOT NULL,
  next_offset integer DEFAULT 0 NOT NULL,
  last_success_at timestamp with time zone,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."character_external_ids" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  character_id uuid NOT NULL,
  source text NOT NULL,
  external_id text NOT NULL,
  source_url text,
  last_verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."characters" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  name_ja text,
  description text,
  image_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  name_kana text,
  name_en text,
  nickname text,
  nickname_en text,
  description_en text,
  series_id uuid,
  source text,
  source_id text
);

create table if not exists "public"."episode_external_ids" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  episode_id uuid NOT NULL,
  source text NOT NULL,
  external_id text NOT NULL,
  source_url text,
  last_verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."episodes" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  anime_id uuid NOT NULL,
  episode_number text,
  episode_order integer NOT NULL,
  episode_kind text DEFAULT 'regular'::text NOT NULL,
  title text,
  title_ja text,
  synopsis text,
  aired_at date,
  duration_seconds integer,
  is_published boolean DEFAULT false NOT NULL,
  source_synced_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  source text,
  source_id text
);

create table if not exists "public"."favorites" (
  user_id uuid NOT NULL,
  anime_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."genres" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  name_ja text,
  description text
);

create table if not exists "public"."organization_external_ids" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  organization_id uuid NOT NULL,
  source text NOT NULL,
  external_id text NOT NULL,
  source_url text,
  last_verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."organizations" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  name_ja text,
  name_kana text,
  name_en text,
  website_url text,
  wikipedia_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  source text,
  source_id text
);

create table if not exists "public"."people" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  name_ja text,
  person_type text,
  biography text,
  image_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  name_kana text,
  name_en text,
  nickname text,
  nickname_en text,
  official_url text,
  wikipedia_url text,
  birthday text,
  source text,
  source_id text
);

create table if not exists "public"."people_external_ids" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  person_id uuid NOT NULL,
  source text NOT NULL,
  external_id text NOT NULL,
  source_url text,
  last_verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."profiles" (
  id uuid NOT NULL,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  is_public boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."quiz_answers" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  attempt_id uuid NOT NULL,
  question_id uuid NOT NULL,
  selected_choice_id uuid,
  is_correct boolean
);

create table if not exists "public"."quiz_attempts" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  quiz_id uuid NOT NULL,
  score integer DEFAULT 0 NOT NULL,
  max_score integer DEFAULT 0 NOT NULL,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."quiz_choices" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  question_id uuid NOT NULL,
  choice_text text NOT NULL,
  choice_order integer NOT NULL
);

create table if not exists "public"."quiz_questions" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  quiz_id uuid NOT NULL,
  question_text text NOT NULL,
  explanation text,
  question_order integer NOT NULL,
  points integer DEFAULT 1 NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."quizzes" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  title text NOT NULL,
  description text,
  category text NOT NULL,
  difficulty smallint NOT NULL,
  is_published boolean DEFAULT false NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."ratings" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  anime_id uuid NOT NULL,
  score numeric(3,1) NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."reviews" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  anime_id uuid NOT NULL,
  title text,
  body text NOT NULL,
  spoiler boolean DEFAULT false NOT NULL,
  is_published boolean DEFAULT true NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."series" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  name_ro text,
  name_en text,
  description text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  source text,
  source_id text
);

create table if not exists "public"."series_external_ids" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  series_id uuid NOT NULL,
  source text NOT NULL,
  external_id text NOT NULL,
  source_url text,
  last_verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."studio_external_ids" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  studio_id uuid NOT NULL,
  source text NOT NULL,
  external_id text NOT NULL,
  source_url text,
  last_verified_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."studios" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  name_ja text,
  website_url text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  name_kana text,
  name_en text,
  wikipedia_url text,
  source text,
  source_id text
);

create table if not exists "public"."tags" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  name text NOT NULL,
  name_ja text,
  description text
);

create table if not exists "public"."user_achievements" (
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL,
  earned_at timestamp with time zone DEFAULT now() NOT NULL
);

create table if not exists "public"."watch_entries" (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  user_id uuid NOT NULL,
  anime_id uuid NOT NULL,
  status watch_status NOT NULL,
  episodes_watched integer DEFAULT 0 NOT NULL,
  started_on date,
  completed_on date,
  notes text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

alter table "private"."admin_users" add constraint "admin_users_pkey" PRIMARY KEY (user_id);

alter table "private"."admin_users" add constraint "admin_users_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table "private"."quiz_answer_keys" add constraint "quiz_answer_keys_correct_choice_id_fkey" FOREIGN KEY (correct_choice_id) REFERENCES quiz_choices(id) ON DELETE CASCADE;

alter table "private"."quiz_answer_keys" add constraint "quiz_answer_keys_pkey" PRIMARY KEY (question_id);

alter table "private"."quiz_answer_keys" add constraint "quiz_answer_keys_question_id_fkey" FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE;

alter table "public"."achievements" add constraint "achievements_code_key" UNIQUE (code);

alter table "public"."achievements" add constraint "achievements_pkey" PRIMARY KEY (id);

alter table "public"."achievements" add constraint "achievements_points_check" CHECK (points >= 0);

alter table "public"."anime" add constraint "anime_episode_count_check" CHECK (episode_count IS NULL OR episode_count >= 0);

alter table "public"."anime" add constraint "anime_episode_duration_minutes_check" CHECK (episode_duration_minutes IS NULL OR episode_duration_minutes > 0);

alter table "public"."anime" add constraint "anime_episodes_count_check" CHECK (episodes_count IS NULL OR episodes_count >= 0);

alter table "public"."anime" add constraint "anime_pkey" PRIMARY KEY (id);

alter table "public"."anime" add constraint "anime_release_year_check" CHECK (release_year >= 1900 AND release_year <= 2200);

alter table "public"."anime" add constraint "anime_reviews_count_check" CHECK (reviews_count IS NULL OR reviews_count >= 0);

alter table "public"."anime" add constraint "anime_source_source_id_key" UNIQUE (source, source_id);

alter table "public"."anime" add constraint "anime_studio_id_fkey" FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE SET NULL;

alter table "public"."anime" add constraint "anime_watchers_count_check" CHECK (watchers_count IS NULL OR watchers_count >= 0);

alter table "public"."anime_characters" add constraint "anime_characters_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."anime_characters" add constraint "anime_characters_character_id_fkey" FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;

alter table "public"."anime_characters" add constraint "anime_characters_pkey" PRIMARY KEY (anime_id, character_id);

alter table "public"."anime_external_ids" add constraint "anime_external_anime_source_key" UNIQUE (anime_id, source);

alter table "public"."anime_external_ids" add constraint "anime_external_id_nonempty_chk" CHECK (length(btrim(external_id)) > 0);

alter table "public"."anime_external_ids" add constraint "anime_external_ids_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."anime_external_ids" add constraint "anime_external_ids_pkey" PRIMARY KEY (id);

alter table "public"."anime_external_ids" add constraint "anime_external_source_id_key" UNIQUE (source, external_id);

alter table "public"."anime_external_ids" add constraint "anime_external_source_nonempty_chk" CHECK (length(btrim(source)) > 0);

alter table "public"."anime_genres" add constraint "anime_genres_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."anime_genres" add constraint "anime_genres_genre_id_fkey" FOREIGN KEY (genre_id) REFERENCES genres(id) ON DELETE CASCADE;

alter table "public"."anime_genres" add constraint "anime_genres_pkey" PRIMARY KEY (anime_id, genre_id);

alter table "public"."anime_organization_staff" add constraint "anime_organization_staff_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."anime_organization_staff" add constraint "anime_organization_staff_order_chk" CHECK (display_order > 0);

alter table "public"."anime_organization_staff" add constraint "anime_organization_staff_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE RESTRICT;

alter table "public"."anime_organization_staff" add constraint "anime_organization_staff_pkey" PRIMARY KEY (id);

alter table "public"."anime_organization_staff" add constraint "anime_organization_staff_role_nonempty_chk" CHECK (length(btrim(role)) > 0);

alter table "public"."anime_organization_staff" add constraint "anime_organization_staff_unique" UNIQUE (anime_id, organization_id, role);

alter table "public"."anime_relations" add constraint "anime_relations_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."anime_relations" add constraint "anime_relations_not_self_chk" CHECK (anime_id <> related_anime_id);

alter table "public"."anime_relations" add constraint "anime_relations_order_chk" CHECK (display_order > 0);

alter table "public"."anime_relations" add constraint "anime_relations_pkey" PRIMARY KEY (anime_id, related_anime_id, relation_type);

alter table "public"."anime_relations" add constraint "anime_relations_related_anime_id_fkey" FOREIGN KEY (related_anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."anime_relations" add constraint "anime_relations_type_chk" CHECK (relation_type = ANY (ARRAY['sequel'::text, 'prequel'::text, 'side_story'::text, 'spin_off'::text, 'alternative_version'::text, 'summary'::text, 'parent_story'::text, 'adaptation'::text, 'other'::text]));

alter table "public"."anime_series" add constraint "anime_series_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."anime_series" add constraint "anime_series_order_chk" CHECK (display_order > 0);

alter table "public"."anime_series" add constraint "anime_series_pkey" PRIMARY KEY (anime_id, series_id, series_role);

alter table "public"."anime_series" add constraint "anime_series_role_chk" CHECK (series_role = ANY (ARRAY['main'::text, 'franchise'::text, 'season'::text, 'related'::text, 'other'::text]));

alter table "public"."anime_series" add constraint "anime_series_series_id_fkey" FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE;

alter table "public"."anime_staff" add constraint "anime_staff_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."anime_staff" add constraint "anime_staff_anime_id_person_id_role_character_id_key" UNIQUE (anime_id, person_id, role, character_id);

alter table "public"."anime_staff" add constraint "anime_staff_character_id_fkey" FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL;

alter table "public"."anime_staff" add constraint "anime_staff_person_id_fkey" FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;

alter table "public"."anime_staff" add constraint "anime_staff_pkey" PRIMARY KEY (id);

alter table "public"."anime_staff_external_ids" add constraint "anime_staff_external_ids_anime_staff_id_fkey" FOREIGN KEY (anime_staff_id) REFERENCES anime_staff(id) ON DELETE CASCADE;

alter table "public"."anime_staff_external_ids" add constraint "anime_staff_external_ids_pkey" PRIMARY KEY (id);

alter table "public"."anime_staff_external_ids" add constraint "anime_staff_external_relation_source_key" UNIQUE (anime_staff_id, source);

alter table "public"."anime_staff_external_ids" add constraint "anime_staff_external_source_id_key" UNIQUE (source, external_id);

alter table "public"."anime_studios" add constraint "anime_studios_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."anime_studios" add constraint "anime_studios_order_chk" CHECK (display_order > 0);

alter table "public"."anime_studios" add constraint "anime_studios_pkey" PRIMARY KEY (anime_id, studio_id, production_role);

alter table "public"."anime_studios" add constraint "anime_studios_role_chk" CHECK (production_role = ANY (ARRAY['animation'::text, 'production'::text, 'planning'::text, 'cooperation'::text, 'other'::text]));

alter table "public"."anime_studios" add constraint "anime_studios_studio_id_fkey" FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE RESTRICT;

alter table "public"."anime_tags" add constraint "anime_tags_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."anime_tags" add constraint "anime_tags_pkey" PRIMARY KEY (anime_id, tag_id);

alter table "public"."anime_tags" add constraint "anime_tags_tag_id_fkey" FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;

alter table "public"."anime_titles" add constraint "anime_titles_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."anime_titles" add constraint "anime_titles_language_code_chk" CHECK (language_code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'::text);

alter table "public"."anime_titles" add constraint "anime_titles_pkey" PRIMARY KEY (id);

alter table "public"."anime_titles" add constraint "anime_titles_title_nonempty_chk" CHECK (length(btrim(title)) > 0);

alter table "public"."anime_titles" add constraint "anime_titles_type_chk" CHECK (title_type = ANY (ARRAY['official'::text, 'main'::text, 'english'::text, 'japanese'::text, 'kana'::text, 'romaji'::text, 'synonym'::text, 'short'::text]));

alter table "public"."announcements" add constraint "announcements_pkey" PRIMARY KEY (id);

alter table "public"."catalog_entity_aliases" add constraint "catalog_entity_aliases_alias_check" CHECK (length(btrim(alias)) > 0);

alter table "public"."catalog_entity_aliases" add constraint "catalog_entity_aliases_entity_type_check" CHECK (entity_type = ANY (ARRAY['people'::text, 'characters'::text, 'studios'::text, 'organizations'::text]));

alter table "public"."catalog_entity_aliases" add constraint "catalog_entity_aliases_pkey" PRIMARY KEY (id);

alter table "public"."catalog_entity_merge_log" add constraint "catalog_entity_merge_log_check" CHECK (source_entity_id <> target_entity_id);

alter table "public"."catalog_entity_merge_log" add constraint "catalog_entity_merge_log_entity_type_check" CHECK (entity_type = ANY (ARRAY['people'::text, 'characters'::text, 'studios'::text, 'organizations'::text]));

alter table "public"."catalog_entity_merge_log" add constraint "catalog_entity_merge_log_pkey" PRIMARY KEY (id);

alter table "public"."catalog_sources" add constraint "catalog_sources_pkey" PRIMARY KEY (code);

alter table "public"."catalog_sources" add constraint "catalog_sources_review_status_chk" CHECK (rights_review_status = ANY (ARRAY['pending'::text, 'approved'::text, 'restricted'::text, 'rejected'::text]));

alter table "public"."catalog_sync_runs" add constraint "catalog_sync_runs_pkey" PRIMARY KEY (id);

alter table "public"."catalog_sync_runs" add constraint "catalog_sync_runs_status_check" CHECK (status = ANY (ARRAY['running'::text, 'succeeded'::text, 'partial'::text, 'failed'::text]));

alter table "public"."catalog_sync_secrets" add constraint "catalog_sync_secrets_id_check" CHECK (id = 1);

alter table "public"."catalog_sync_secrets" add constraint "catalog_sync_secrets_pkey" PRIMARY KEY (id);

alter table "public"."catalog_sync_state" add constraint "catalog_sync_state_next_offset_check" CHECK (next_offset >= 0);

alter table "public"."catalog_sync_state" add constraint "catalog_sync_state_pkey" PRIMARY KEY (source);

alter table "public"."character_external_ids" add constraint "character_external_character_source_key" UNIQUE (character_id, source);

alter table "public"."character_external_ids" add constraint "character_external_ids_character_id_fkey" FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE;

alter table "public"."character_external_ids" add constraint "character_external_ids_pkey" PRIMARY KEY (id);

alter table "public"."character_external_ids" add constraint "character_external_source_id_key" UNIQUE (source, external_id);

alter table "public"."characters" add constraint "characters_pkey" PRIMARY KEY (id);

alter table "public"."characters" add constraint "characters_series_id_fkey" FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE SET NULL;

alter table "public"."episode_external_ids" add constraint "episode_external_id_nonempty_chk" CHECK (length(btrim(external_id)) > 0);

alter table "public"."episode_external_ids" add constraint "episode_external_ids_episode_id_fkey" FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE;

alter table "public"."episode_external_ids" add constraint "episode_external_ids_pkey" PRIMARY KEY (id);

alter table "public"."episode_external_ids" add constraint "episode_external_source_id_key" UNIQUE (source, external_id);

alter table "public"."episodes" add constraint "episodes_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."episodes" add constraint "episodes_anime_order_key" UNIQUE (anime_id, episode_order);

alter table "public"."episodes" add constraint "episodes_duration_chk" CHECK (duration_seconds IS NULL OR duration_seconds > 0);

alter table "public"."episodes" add constraint "episodes_kind_chk" CHECK (episode_kind = ANY (ARRAY['regular'::text, 'special'::text, 'recap'::text, 'trailer'::text, 'unknown'::text]));

alter table "public"."episodes" add constraint "episodes_number_nonempty_chk" CHECK (episode_number IS NULL OR length(btrim(episode_number)) > 0);

alter table "public"."episodes" add constraint "episodes_order_positive_chk" CHECK (episode_order > 0);

alter table "public"."episodes" add constraint "episodes_pkey" PRIMARY KEY (id);

alter table "public"."favorites" add constraint "favorites_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."favorites" add constraint "favorites_pkey" PRIMARY KEY (user_id, anime_id);

alter table "public"."favorites" add constraint "favorites_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table "public"."genres" add constraint "genres_name_key" UNIQUE (name);

alter table "public"."genres" add constraint "genres_pkey" PRIMARY KEY (id);

alter table "public"."organization_external_ids" add constraint "organization_external_ids_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

alter table "public"."organization_external_ids" add constraint "organization_external_ids_pkey" PRIMARY KEY (id);

alter table "public"."organization_external_ids" add constraint "organization_external_org_source_key" UNIQUE (organization_id, source);

alter table "public"."organization_external_ids" add constraint "organization_external_source_id_key" UNIQUE (source, external_id);

alter table "public"."organizations" add constraint "organizations_name_nonempty_chk" CHECK (length(btrim(name)) > 0);

alter table "public"."organizations" add constraint "organizations_pkey" PRIMARY KEY (id);

alter table "public"."people" add constraint "people_pkey" PRIMARY KEY (id);

alter table "public"."people_external_ids" add constraint "people_external_ids_person_id_fkey" FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE;

alter table "public"."people_external_ids" add constraint "people_external_ids_pkey" PRIMARY KEY (id);

alter table "public"."people_external_ids" add constraint "people_external_person_source_key" UNIQUE (person_id, source);

alter table "public"."people_external_ids" add constraint "people_external_source_id_key" UNIQUE (source, external_id);

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY (id);

alter table "public"."profiles" add constraint "profiles_username_key" UNIQUE (username);

alter table "public"."profiles" add constraint "username_length" CHECK (username IS NULL OR char_length(username) >= 3 AND char_length(username) <= 24);

alter table "public"."quiz_answers" add constraint "quiz_answers_attempt_id_fkey" FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(id) ON DELETE CASCADE;

alter table "public"."quiz_answers" add constraint "quiz_answers_attempt_id_question_id_key" UNIQUE (attempt_id, question_id);

alter table "public"."quiz_answers" add constraint "quiz_answers_pkey" PRIMARY KEY (id);

alter table "public"."quiz_answers" add constraint "quiz_answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE;

alter table "public"."quiz_answers" add constraint "quiz_answers_selected_choice_id_fkey" FOREIGN KEY (selected_choice_id) REFERENCES quiz_choices(id) ON DELETE SET NULL;

alter table "public"."quiz_attempts" add constraint "quiz_attempts_max_score_check" CHECK (max_score >= 0);

alter table "public"."quiz_attempts" add constraint "quiz_attempts_pkey" PRIMARY KEY (id);

alter table "public"."quiz_attempts" add constraint "quiz_attempts_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;

alter table "public"."quiz_attempts" add constraint "quiz_attempts_score_check" CHECK (score >= 0);

alter table "public"."quiz_attempts" add constraint "quiz_attempts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table "public"."quiz_choices" add constraint "quiz_choices_choice_order_check" CHECK (choice_order > 0);

alter table "public"."quiz_choices" add constraint "quiz_choices_pkey" PRIMARY KEY (id);

alter table "public"."quiz_choices" add constraint "quiz_choices_question_id_choice_order_key" UNIQUE (question_id, choice_order);

alter table "public"."quiz_choices" add constraint "quiz_choices_question_id_fkey" FOREIGN KEY (question_id) REFERENCES quiz_questions(id) ON DELETE CASCADE;

alter table "public"."quiz_questions" add constraint "quiz_questions_pkey" PRIMARY KEY (id);

alter table "public"."quiz_questions" add constraint "quiz_questions_points_check" CHECK (points > 0);

alter table "public"."quiz_questions" add constraint "quiz_questions_question_order_check" CHECK (question_order > 0);

alter table "public"."quiz_questions" add constraint "quiz_questions_quiz_id_fkey" FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE;

alter table "public"."quiz_questions" add constraint "quiz_questions_quiz_id_question_order_key" UNIQUE (quiz_id, question_order);

alter table "public"."quizzes" add constraint "quizzes_difficulty_check" CHECK (difficulty >= 1 AND difficulty <= 5);

alter table "public"."quizzes" add constraint "quizzes_pkey" PRIMARY KEY (id);

alter table "public"."ratings" add constraint "ratings_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."ratings" add constraint "ratings_pkey" PRIMARY KEY (id);

alter table "public"."ratings" add constraint "ratings_score_check" CHECK (score >= 0.5 AND score <= 10.0 AND mod(score, 0.5) = 0::numeric);

alter table "public"."ratings" add constraint "ratings_user_id_anime_id_key" UNIQUE (user_id, anime_id);

alter table "public"."ratings" add constraint "ratings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table "public"."reviews" add constraint "reviews_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."reviews" add constraint "reviews_body_check" CHECK (char_length(body) >= 1 AND char_length(body) <= 10000);

alter table "public"."reviews" add constraint "reviews_pkey" PRIMARY KEY (id);

alter table "public"."reviews" add constraint "reviews_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table "public"."series" add constraint "series_name_nonempty_chk" CHECK (length(btrim(name)) > 0);

alter table "public"."series" add constraint "series_pkey" PRIMARY KEY (id);

alter table "public"."series_external_ids" add constraint "series_external_ids_pkey" PRIMARY KEY (id);

alter table "public"."series_external_ids" add constraint "series_external_ids_series_id_fkey" FOREIGN KEY (series_id) REFERENCES series(id) ON DELETE CASCADE;

alter table "public"."series_external_ids" add constraint "series_external_series_source_key" UNIQUE (series_id, source);

alter table "public"."series_external_ids" add constraint "series_external_source_id_key" UNIQUE (source, external_id);

alter table "public"."studio_external_ids" add constraint "studio_external_ids_pkey" PRIMARY KEY (id);

alter table "public"."studio_external_ids" add constraint "studio_external_ids_studio_id_fkey" FOREIGN KEY (studio_id) REFERENCES studios(id) ON DELETE CASCADE;

alter table "public"."studio_external_ids" add constraint "studio_external_source_id_key" UNIQUE (source, external_id);

alter table "public"."studio_external_ids" add constraint "studio_external_studio_source_key" UNIQUE (studio_id, source);

alter table "public"."studios" add constraint "studios_name_key" UNIQUE (name);

alter table "public"."studios" add constraint "studios_pkey" PRIMARY KEY (id);

alter table "public"."tags" add constraint "tags_name_key" UNIQUE (name);

alter table "public"."tags" add constraint "tags_pkey" PRIMARY KEY (id);

alter table "public"."user_achievements" add constraint "user_achievements_achievement_id_fkey" FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE;

alter table "public"."user_achievements" add constraint "user_achievements_pkey" PRIMARY KEY (user_id, achievement_id);

alter table "public"."user_achievements" add constraint "user_achievements_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

alter table "public"."watch_entries" add constraint "watch_entries_anime_id_fkey" FOREIGN KEY (anime_id) REFERENCES anime(id) ON DELETE CASCADE;

alter table "public"."watch_entries" add constraint "watch_entries_episodes_watched_check" CHECK (episodes_watched >= 0);

alter table "public"."watch_entries" add constraint "watch_entries_pkey" PRIMARY KEY (id);

alter table "public"."watch_entries" add constraint "watch_entries_user_id_anime_id_key" UNIQUE (user_id, anime_id);

alter table "public"."watch_entries" add constraint "watch_entries_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
