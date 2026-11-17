CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(
  p_user_id uuid,
  p_quiz_id uuid,
  p_answers jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_attempt_id uuid;
  v_question record;
  v_answer jsonb;
  v_choice_id uuid;
  v_correct_choice_id uuid;
  v_score integer := 0;
  v_max_score integer := 0;
  v_question_count integer := 0;
  v_is_correct boolean;
BEGIN
  IF p_user_id IS NULL OR p_quiz_id IS NULL THEN RAISE EXCEPTION 'Missing user or quiz identifier'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id) THEN RAISE EXCEPTION 'User not found'; END IF;
  IF jsonb_typeof(p_answers) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Answers must be an array'; END IF;
  IF jsonb_array_length(p_answers) > 100 THEN RAISE EXCEPTION 'Too many answers'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.quizzes q WHERE q.id = p_quiz_id AND q.is_published = true) THEN RAISE EXCEPTION 'Quiz is not available'; END IF;
  SELECT count(*)::integer, coalesce(sum(qq.points), 0)::integer INTO v_question_count, v_max_score
  FROM public.quiz_questions qq WHERE qq.quiz_id = p_quiz_id;
  IF v_question_count = 0 THEN RAISE EXCEPTION 'Quiz has no questions'; END IF;
  IF jsonb_array_length(p_answers) <> v_question_count THEN RAISE EXCEPTION 'Answer count does not match question count'; END IF;
  INSERT INTO public.quiz_attempts (user_id, quiz_id, score, max_score, completed_at)
  VALUES (p_user_id, p_quiz_id, 0, v_max_score, now()) RETURNING id INTO v_attempt_id;
  FOR v_question IN SELECT qq.id, qq.points FROM public.quiz_questions qq WHERE qq.quiz_id = p_quiz_id ORDER BY qq.question_order LOOP
    SELECT answer_item INTO v_answer FROM jsonb_array_elements(p_answers) AS answer_item
    WHERE answer_item->>'question_id' = v_question.id::text LIMIT 1;
    IF v_answer IS NULL THEN RAISE EXCEPTION 'Missing answer for question %', v_question.id; END IF;
    v_choice_id := nullif(v_answer->>'selected_choice_id', '')::uuid;
    IF v_choice_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.quiz_choices qc WHERE qc.id = v_choice_id AND qc.question_id = v_question.id
    ) THEN RAISE EXCEPTION 'Selected choice does not belong to question'; END IF;
    SELECT qak.correct_choice_id INTO v_correct_choice_id
    FROM private.quiz_answer_keys qak WHERE qak.question_id = v_question.id;
    IF v_correct_choice_id IS NULL THEN RAISE EXCEPTION 'Answer key is not configured for question %', v_question.id; END IF;
    v_is_correct := (v_choice_id IS NOT NULL AND v_choice_id = v_correct_choice_id);
    IF v_is_correct THEN v_score := v_score + v_question.points; END IF;
    INSERT INTO public.quiz_answers (attempt_id, question_id, selected_choice_id, is_correct)
    VALUES (v_attempt_id, v_question.id, v_choice_id, v_is_correct);
  END LOOP;
  UPDATE public.quiz_attempts SET score = v_score, max_score = v_max_score, completed_at = now() WHERE id = v_attempt_id;
  RETURN jsonb_build_object('attempt_id', v_attempt_id, 'score', v_score, 'max_score', v_max_score);
END;
$function$;
REVOKE ALL ON FUNCTION public.submit_quiz_attempt(uuid, uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quiz_attempt(uuid, uuid, jsonb) TO service_role;
