-- In-app notification for new chat messages (recipient only).
-- Inserts via SECURITY DEFINER because notifications INSERT is service_role only.

CREATE OR REPLACE FUNCTION public.notify_recipient_on_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer uuid;
  v_seller uuid;
  v_recipient uuid;
  v_marker text;
BEGIN
  SELECT buyer_id, seller_id INTO v_buyer, v_seller
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF v_buyer IS NULL OR v_seller IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.sender_id = v_buyer THEN
    v_recipient := v_seller;
  ELSIF NEW.sender_id = v_seller THEN
    v_recipient := v_buyer;
  ELSE
    RETURN NEW;
  END IF;

  IF v_recipient IS NULL OR v_recipient = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  v_marker := '[mid:' || NEW.id::text || ']';

  IF EXISTS (
    SELECT 1 FROM public.notifications
    WHERE message LIKE '%' || v_marker || '%'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (
    v_recipient,
    'new_message',
    'Mesazh i ri',
    'Ke marrë një mesazh të ri. ' || v_marker,
    '/messages?conversation=' || NEW.conversation_id::text
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_message_notify_recipient ON public.messages;

CREATE TRIGGER on_message_notify_recipient
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_recipient_on_new_message();
