create policy "Active achievements are readable" on "public"."achievements" as PERMISSIVE for SELECT to "anon", "authenticated" using ((is_active = true));

create policy "ANIXIA admins can read catalog candidates" on "public"."anime" as PERMISSIVE for SELECT to "authenticated" using (( SELECT private.is_anixia_admin() AS is_anixia_admin));

create policy "ANIXIA admins can update catalog candidates" on "public"."anime" as PERMISSIVE for UPDATE to "authenticated" using (( SELECT private.is_anixia_admin() AS is_anixia_admin)) with check (( SELECT private.is_anixia_admin() AS is_anixia_admin));

create policy "ANIXIA admins read all anime characters" on "public"."anime_characters" as PERMISSIVE for SELECT to "authenticated" using (private.is_anixia_admin());

create policy "Anime characters are readable" on "public"."anime_characters" as PERMISSIVE for SELECT to "anon", "authenticated" using (private.is_published_anime(anime_id));

create policy "ANIXIA admins manage anime external ids" on "public"."anime_external_ids" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins manage anime genres" on "public"."anime_genres" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins read all anime genres" on "public"."anime_genres" as PERMISSIVE for SELECT to "authenticated" using (private.is_anixia_admin());

create policy "Anime genres are readable" on "public"."anime_genres" as PERMISSIVE for SELECT to "anon", "authenticated" using (private.is_published_anime(anime_id));

create policy "ANIXIA admins manage organization staff" on "public"."anime_organization_staff" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "Organization staff of published anime are readable" on "public"."anime_organization_staff" as PERMISSIVE for SELECT to "anon", "authenticated" using (private.is_published_anime(anime_id));

create policy "ANIXIA admins manage anime relations" on "public"."anime_relations" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "Relations between published anime are readable" on "public"."anime_relations" as PERMISSIVE for SELECT to "anon", "authenticated" using ((private.is_published_anime(anime_id) AND private.is_published_anime(related_anime_id)));

create policy "ANIXIA admins manage anime series links" on "public"."anime_series" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "Series links of published anime are readable" on "public"."anime_series" as PERMISSIVE for SELECT to "anon", "authenticated" using (private.is_published_anime(anime_id));

create policy "ANIXIA admins read all anime staff" on "public"."anime_staff" as PERMISSIVE for SELECT to "authenticated" using (private.is_anixia_admin());

create policy "Anime staff are readable" on "public"."anime_staff" as PERMISSIVE for SELECT to "anon", "authenticated" using (private.is_published_anime(anime_id));

create policy "ANIXIA admins manage anime staff external ids" on "public"."anime_staff_external_ids" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins manage anime studios" on "public"."anime_studios" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "Studios of published anime are readable" on "public"."anime_studios" as PERMISSIVE for SELECT to "anon", "authenticated" using (private.is_published_anime(anime_id));

create policy "ANIXIA admins manage anime tags" on "public"."anime_tags" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins read all anime tags" on "public"."anime_tags" as PERMISSIVE for SELECT to "authenticated" using (private.is_anixia_admin());

create policy "Anime tags are readable" on "public"."anime_tags" as PERMISSIVE for SELECT to "anon", "authenticated" using (private.is_published_anime(anime_id));

create policy "ANIXIA admins manage anime titles" on "public"."anime_titles" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "Published anime titles are readable" on "public"."anime_titles" as PERMISSIVE for SELECT to "anon", "authenticated" using (private.is_published_anime(anime_id));

create policy "Published announcements are readable" on "public"."announcements" as PERMISSIVE for SELECT to "anon", "authenticated" using ((is_published = true));

create policy "ANIXIA admins manage catalog sources" on "public"."catalog_sources" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins manage character external ids" on "public"."character_external_ids" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins read all characters" on "public"."characters" as PERMISSIVE for SELECT to "authenticated" using (private.is_anixia_admin());

create policy "Characters linked to published anime are readable" on "public"."characters" as PERMISSIVE for SELECT to "anon", "authenticated" using ((EXISTS ( SELECT 1
   FROM anime_characters ac
  WHERE ((ac.character_id = characters.id) AND private.is_published_anime(ac.anime_id)))));

create policy "ANIXIA admins manage episode external ids" on "public"."episode_external_ids" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins manage episodes" on "public"."episodes" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "Episodes of published anime are readable" on "public"."episodes" as PERMISSIVE for SELECT to "anon", "authenticated" using (((is_published = true) AND private.is_published_anime(anime_id)));

create policy "Users manage own favorites" on "public"."favorites" as PERMISSIVE for ALL to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "ANIXIA admins manage genres" on "public"."genres" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins read all genres" on "public"."genres" as PERMISSIVE for SELECT to "authenticated" using (private.is_anixia_admin());

create policy "Genres linked to published anime are readable" on "public"."genres" as PERMISSIVE for SELECT to "anon", "authenticated" using ((EXISTS ( SELECT 1
   FROM anime_genres ag
  WHERE ((ag.genre_id = genres.id) AND private.is_published_anime(ag.anime_id)))));

create policy "ANIXIA admins manage organization external ids" on "public"."organization_external_ids" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins manage organizations" on "public"."organizations" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "Organizations linked to published anime are readable" on "public"."organizations" as PERMISSIVE for SELECT to "anon", "authenticated" using ((EXISTS ( SELECT 1
   FROM anime_organization_staff s
  WHERE ((s.organization_id = organizations.id) AND private.is_published_anime(s.anime_id)))));

create policy "ANIXIA admins read all people" on "public"."people" as PERMISSIVE for SELECT to "authenticated" using (private.is_anixia_admin());

create policy "People linked to published anime are readable" on "public"."people" as PERMISSIVE for SELECT to "anon", "authenticated" using ((EXISTS ( SELECT 1
   FROM anime_staff s
  WHERE ((s.person_id = people.id) AND private.is_published_anime(s.anime_id)))));

create policy "ANIXIA admins manage people external ids" on "public"."people_external_ids" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "Users can read own profile" on "public"."profiles" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = id));

create policy "Users can update own profile" on "public"."profiles" as PERMISSIVE for UPDATE to "authenticated" using ((( SELECT auth.uid() AS uid) = id)) with check ((( SELECT auth.uid() AS uid) = id));

create policy "Users manage answers for own attempts" on "public"."quiz_answers" as PERMISSIVE for ALL to "authenticated" using ((EXISTS ( SELECT 1
   FROM quiz_attempts qa
  WHERE ((qa.id = quiz_answers.attempt_id) AND (qa.user_id = ( SELECT auth.uid() AS uid)))))) with check ((EXISTS ( SELECT 1
   FROM quiz_attempts qa
  WHERE ((qa.id = quiz_answers.attempt_id) AND (qa.user_id = ( SELECT auth.uid() AS uid))))));

create policy "Users manage own quiz attempts" on "public"."quiz_attempts" as PERMISSIVE for ALL to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "Choices of published quiz questions are readable" on "public"."quiz_choices" as PERMISSIVE for SELECT to "anon", "authenticated" using ((EXISTS ( SELECT 1
   FROM (quiz_questions qq
     JOIN quizzes q ON ((q.id = qq.quiz_id)))
  WHERE ((qq.id = quiz_choices.question_id) AND (q.is_published = true)))));

create policy "Questions of published quizzes are readable" on "public"."quiz_questions" as PERMISSIVE for SELECT to "anon", "authenticated" using ((EXISTS ( SELECT 1
   FROM quizzes q
  WHERE ((q.id = quiz_questions.quiz_id) AND (q.is_published = true)))));

create policy "Published quizzes are readable" on "public"."quizzes" as PERMISSIVE for SELECT to "anon", "authenticated" using ((is_published = true));

create policy "Users manage own ratings" on "public"."ratings" as PERMISSIVE for ALL to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));

create policy "ANIXIA admins moderate reviews" on "public"."reviews" as PERMISSIVE for UPDATE to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins read all reviews" on "public"."reviews" as PERMISSIVE for SELECT to "authenticated" using (private.is_anixia_admin());

create policy "Published reviews are readable" on "public"."reviews" as PERMISSIVE for SELECT to "anon", "authenticated" using ((is_published = true));

create policy "Users create own review drafts" on "public"."reviews" as PERMISSIVE for INSERT to "authenticated" with check (((( SELECT auth.uid() AS uid) = user_id) AND (is_published = false)));

create policy "Users delete own reviews" on "public"."reviews" as PERMISSIVE for DELETE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users read own reviews" on "public"."reviews" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users update own review drafts" on "public"."reviews" as PERMISSIVE for UPDATE to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check (((( SELECT auth.uid() AS uid) = user_id) AND (is_published = false)));

create policy "ANIXIA admins manage series" on "public"."series" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "Series linked to published anime are readable" on "public"."series" as PERMISSIVE for SELECT to "anon", "authenticated" using ((EXISTS ( SELECT 1
   FROM anime_series s
  WHERE ((s.series_id = series.id) AND private.is_published_anime(s.anime_id)))));

create policy "ANIXIA admins manage series external ids" on "public"."series_external_ids" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins manage studio external ids" on "public"."studio_external_ids" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins read all studios" on "public"."studios" as PERMISSIVE for SELECT to "authenticated" using (private.is_anixia_admin());

create policy "Studios linked to published anime are readable" on "public"."studios" as PERMISSIVE for SELECT to "anon", "authenticated" using (((EXISTS ( SELECT 1
   FROM anime_studios ast
  WHERE ((ast.studio_id = studios.id) AND private.is_published_anime(ast.anime_id)))) OR (EXISTS ( SELECT 1
   FROM anime a
  WHERE ((a.studio_id = studios.id) AND private.is_published_anime(a.id))))));

create policy "ANIXIA admins manage tags" on "public"."tags" as PERMISSIVE for ALL to "authenticated" using (private.is_anixia_admin()) with check (private.is_anixia_admin());

create policy "ANIXIA admins read all tags" on "public"."tags" as PERMISSIVE for SELECT to "authenticated" using (private.is_anixia_admin());

create policy "Tags linked to published anime are readable" on "public"."tags" as PERMISSIVE for SELECT to "anon", "authenticated" using ((EXISTS ( SELECT 1
   FROM anime_tags atg
  WHERE ((atg.tag_id = tags.id) AND private.is_published_anime(atg.anime_id)))));

create policy "Users read own achievements" on "public"."user_achievements" as PERMISSIVE for SELECT to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id));

create policy "Users manage own watch entries" on "public"."watch_entries" as PERMISSIVE for ALL to "authenticated" using ((( SELECT auth.uid() AS uid) = user_id)) with check ((( SELECT auth.uid() AS uid) = user_id));
