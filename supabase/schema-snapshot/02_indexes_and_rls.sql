-- Standalone indexes and RLS enablement.

CREATE INDEX anime_format_idx ON public.anime USING btree (format);

CREATE INDEX anime_mal_anime_id_idx ON public.anime USING btree (mal_anime_id) WHERE (mal_anime_id IS NOT NULL);

CREATE INDEX anime_published_idx ON public.anime USING btree (is_published);

CREATE INDEX anime_season_name_idx ON public.anime USING btree (season_name);

CREATE INDEX anime_title_idx ON public.anime USING btree (title);

CREATE INDEX anime_title_ja_idx ON public.anime USING btree (title_ja);

CREATE INDEX anime_unpublished_updated_at_idx ON public.anime USING btree (updated_at DESC) WHERE (is_published = false);

CREATE INDEX anime_year_idx ON public.anime USING btree (release_year);

CREATE UNIQUE INDEX anime_source_source_id_unique_idx ON public.anime USING btree (source, source_id) WHERE ((source IS NOT NULL) AND (source_id IS NOT NULL));

CREATE UNIQUE INDEX anime_source_source_id_upsert_key ON public.anime USING btree (source, source_id);

CREATE INDEX anime_characters_character_idx ON public.anime_characters USING btree (character_id);

CREATE INDEX anime_external_anime_idx ON public.anime_external_ids USING btree (anime_id);

CREATE INDEX anime_genres_genre_anime_idx ON public.anime_genres USING btree (genre_id, anime_id);

CREATE INDEX anime_genres_genre_idx ON public.anime_genres USING btree (genre_id);

CREATE INDEX anime_organization_staff_org_idx ON public.anime_organization_staff USING btree (organization_id, anime_id);

CREATE INDEX anime_relations_related_idx ON public.anime_relations USING btree (related_anime_id, relation_type);

CREATE INDEX anime_series_series_idx ON public.anime_series USING btree (series_id, anime_id);

CREATE INDEX anime_staff_person_idx ON public.anime_staff USING btree (person_id);

CREATE INDEX anime_staff_external_relation_idx ON public.anime_staff_external_ids USING btree (anime_staff_id);

CREATE INDEX anime_studios_studio_idx ON public.anime_studios USING btree (studio_id, anime_id);

CREATE INDEX anime_tags_tag_anime_idx ON public.anime_tags USING btree (tag_id, anime_id);

CREATE INDEX anime_tags_tag_idx ON public.anime_tags USING btree (tag_id);

CREATE INDEX anime_titles_title_lower_idx ON public.anime_titles USING btree (lower(title));

CREATE UNIQUE INDEX anime_titles_dedupe_idx ON public.anime_titles USING btree (anime_id, language_code, title_type, lower(title));

CREATE INDEX announcements_published_idx ON public.announcements USING btree (published_at DESC) WHERE (is_published = true);

CREATE INDEX catalog_entity_aliases_alias_idx ON public.catalog_entity_aliases USING btree (lower(alias));

CREATE UNIQUE INDEX catalog_entity_aliases_entity_alias_key ON public.catalog_entity_aliases USING btree (entity_type, entity_id, lower(alias));

CREATE INDEX character_external_character_idx ON public.character_external_ids USING btree (character_id);

CREATE UNIQUE INDEX characters_source_source_id_unique_idx ON public.characters USING btree (source, source_id) WHERE ((source IS NOT NULL) AND (source_id IS NOT NULL));

CREATE UNIQUE INDEX characters_source_source_id_upsert_key ON public.characters USING btree (source, source_id);

CREATE INDEX episode_external_episode_idx ON public.episode_external_ids USING btree (episode_id);

CREATE INDEX episodes_anime_aired_idx ON public.episodes USING btree (anime_id, aired_at, episode_order);

CREATE INDEX episodes_anime_published_idx ON public.episodes USING btree (anime_id, episode_order) WHERE (is_published = true);

CREATE UNIQUE INDEX episodes_source_source_id_unique_idx ON public.episodes USING btree (source, source_id) WHERE ((source IS NOT NULL) AND (source_id IS NOT NULL));

CREATE UNIQUE INDEX episodes_source_source_id_upsert_key ON public.episodes USING btree (source, source_id);

CREATE INDEX organization_external_org_idx ON public.organization_external_ids USING btree (organization_id);

CREATE INDEX organizations_name_lower_idx ON public.organizations USING btree (lower(name));

CREATE UNIQUE INDEX organizations_source_source_id_unique_idx ON public.organizations USING btree (source, source_id) WHERE ((source IS NOT NULL) AND (source_id IS NOT NULL));

CREATE UNIQUE INDEX organizations_source_source_id_upsert_key ON public.organizations USING btree (source, source_id);

CREATE UNIQUE INDEX people_source_source_id_unique_idx ON public.people USING btree (source, source_id) WHERE ((source IS NOT NULL) AND (source_id IS NOT NULL));

CREATE UNIQUE INDEX people_source_source_id_upsert_key ON public.people USING btree (source, source_id);

CREATE INDEX people_external_person_idx ON public.people_external_ids USING btree (person_id);

CREATE INDEX quiz_attempts_user_idx ON public.quiz_attempts USING btree (user_id, created_at DESC);

CREATE INDEX quiz_choices_question_idx ON public.quiz_choices USING btree (question_id, choice_order);

CREATE INDEX quiz_questions_quiz_idx ON public.quiz_questions USING btree (quiz_id, question_order);

CREATE INDEX ratings_anime_idx ON public.ratings USING btree (anime_id);

CREATE INDEX reviews_anime_published_idx ON public.reviews USING btree (anime_id, is_published);

CREATE INDEX series_name_lower_idx ON public.series USING btree (lower(name));

CREATE UNIQUE INDEX series_source_source_id_unique_idx ON public.series USING btree (source, source_id) WHERE ((source IS NOT NULL) AND (source_id IS NOT NULL));

CREATE UNIQUE INDEX series_source_source_id_upsert_key ON public.series USING btree (source, source_id);

CREATE INDEX series_external_series_idx ON public.series_external_ids USING btree (series_id);

CREATE INDEX studio_external_studio_idx ON public.studio_external_ids USING btree (studio_id);

CREATE UNIQUE INDEX studios_source_source_id_unique_idx ON public.studios USING btree (source, source_id) WHERE ((source IS NOT NULL) AND (source_id IS NOT NULL));

CREATE UNIQUE INDEX studios_source_source_id_upsert_key ON public.studios USING btree (source, source_id);

CREATE INDEX watch_entries_user_status_idx ON public.watch_entries USING btree (user_id, status);

alter table "private"."admin_users" enable row level security;

alter table "private"."quiz_answer_keys" enable row level security;

alter table "public"."achievements" enable row level security;

alter table "public"."anime" enable row level security;

alter table "public"."anime_characters" enable row level security;

alter table "public"."anime_external_ids" enable row level security;

alter table "public"."anime_genres" enable row level security;

alter table "public"."anime_organization_staff" enable row level security;

alter table "public"."anime_relations" enable row level security;

alter table "public"."anime_series" enable row level security;

alter table "public"."anime_staff" enable row level security;

alter table "public"."anime_staff_external_ids" enable row level security;

alter table "public"."anime_studios" enable row level security;

alter table "public"."anime_tags" enable row level security;

alter table "public"."anime_titles" enable row level security;

alter table "public"."announcements" enable row level security;

alter table "public"."catalog_entity_aliases" enable row level security;

alter table "public"."catalog_entity_merge_log" enable row level security;

alter table "public"."catalog_sources" enable row level security;

alter table "public"."catalog_sync_runs" enable row level security;

alter table "public"."catalog_sync_secrets" enable row level security;

alter table "public"."catalog_sync_state" enable row level security;

alter table "public"."character_external_ids" enable row level security;

alter table "public"."characters" enable row level security;

alter table "public"."episode_external_ids" enable row level security;

alter table "public"."episodes" enable row level security;

alter table "public"."favorites" enable row level security;

alter table "public"."genres" enable row level security;

alter table "public"."organization_external_ids" enable row level security;

alter table "public"."organizations" enable row level security;

alter table "public"."people" enable row level security;

alter table "public"."people_external_ids" enable row level security;

alter table "public"."profiles" enable row level security;

alter table "public"."quiz_answers" enable row level security;

alter table "public"."quiz_attempts" enable row level security;

alter table "public"."quiz_choices" enable row level security;

alter table "public"."quiz_questions" enable row level security;

alter table "public"."quizzes" enable row level security;

alter table "public"."ratings" enable row level security;

alter table "public"."reviews" enable row level security;

alter table "public"."series" enable row level security;

alter table "public"."series_external_ids" enable row level security;

alter table "public"."studio_external_ids" enable row level security;

alter table "public"."studios" enable row level security;

alter table "public"."tags" enable row level security;

alter table "public"."user_achievements" enable row level security;

alter table "public"."watch_entries" enable row level security;
