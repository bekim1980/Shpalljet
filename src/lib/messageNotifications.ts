export const NEW_MESSAGE_TYPE = "new_message" as const;
export const NEW_MESSAGE_TITLE = "Mesazh i ri";
export const NEW_MESSAGE_BODY = "Ke marrë një mesazh të ri.";

export function messageConversationLink(conversationId: string): string {
  return `/messages?conversation=${conversationId}`;
}

export function getMessageRecipientId(
  conversation: { buyer_id: string; seller_id: string },
  senderId: string,
): string | null {
  if (senderId === conversation.buyer_id) return conversation.seller_id;
  if (senderId === conversation.seller_id) return conversation.buyer_id;
  return null;
}

export function shouldNotifyRecipient(
  recipientId: string | null,
  senderId: string,
): boolean {
  return !!recipientId && recipientId !== senderId;
}

export function newMessageDedupeMarker(messageId: string): string {
  return `[mid:${messageId}]`;
}

export function buildNewMessageNotification(
  recipientId: string,
  conversationId: string,
  messageId: string,
) {
  return {
    user_id: recipientId,
    type: NEW_MESSAGE_TYPE,
    title: NEW_MESSAGE_TITLE,
    message: `${NEW_MESSAGE_BODY} ${newMessageDedupeMarker(messageId)}`,
    link: messageConversationLink(conversationId),
  };
}

/** Hide internal idempotency markers from notification list UI. */
export function stripNotificationInternalMarkers(text: string): string {
  return text
    .replace(/\s*\[mid:[^\]]+\]\s*$/g, "")
    .replace(/\s*\[pid:[^\]]+\]\s*$/g, "")
    .trim();
}

export function sumConversationUnreadCounts(
  conversations: Array<{ unread_count?: number | null }>,
): number {
  return conversations.reduce((sum, c) => sum + (c.unread_count ?? 0), 0);
}
