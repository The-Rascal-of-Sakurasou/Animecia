-- Keep message threads ordered by their latest message, not only by creation time.
CREATE OR REPLACE FUNCTION private.refresh_message_thread_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
DECLARE v_thread_id uuid;
BEGIN
 IF TG_OP='DELETE' THEN v_thread_id:=OLD.thread_id; ELSE v_thread_id:=NEW.thread_id; END IF;
 UPDATE public.message_threads mt
 SET updated_at=COALESCE((SELECT max(m.created_at) FROM public.thread_messages m WHERE m.thread_id=v_thread_id),mt.created_at)
 WHERE mt.id=v_thread_id;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.refresh_message_thread_activity() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS refresh_message_thread_activity ON public.thread_messages;
CREATE TRIGGER refresh_message_thread_activity AFTER INSERT OR DELETE ON public.thread_messages
FOR EACH ROW EXECUTE FUNCTION private.refresh_message_thread_activity();
