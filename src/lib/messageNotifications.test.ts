import { describe, expect, it } from "vitest";
import {
  NEW_MESSAGE_BODY,
  NEW_MESSAGE_TITLE,
  NEW_MESSAGE_TYPE,
  buildNewMessageNotification,
  getMessageRecipientId,
  messageConversationLink,
  newMessageDedupeMarker,
  shouldNotifyRecipient,
  stripNotificationInternalMarkers,
  sumConversationUnreadCounts,
} from "./messageNotifications";

const conv = { buyer_id: "buyer-1", seller_id: "seller-1" };

describe("messageNotifications", () => {
  it("resolves recipient as the other party", () => {
    expect(getMessageRecipientId(conv, "buyer-1")).toBe("seller-1");
    expect(getMessageRecipientId(conv, "seller-1")).toBe("buyer-1");
    expect(getMessageRecipientId(conv, "stranger")).toBeNull();
  });

  it("never notifies the sender", () => {
    expect(shouldNotifyRecipient("seller-1", "buyer-1")).toBe(true);
    expect(shouldNotifyRecipient("buyer-1", "buyer-1")).toBe(false);
    expect(shouldNotifyRecipient(null, "buyer-1")).toBe(false);
  });

  it("builds correct Albanian notification payload", () => {
    const payload = buildNewMessageNotification("seller-1", "conv-abc", "msg-xyz");
    expect(payload).toEqual({
      user_id: "seller-1",
      type: NEW_MESSAGE_TYPE,
      title: NEW_MESSAGE_TITLE,
      message: `${NEW_MESSAGE_BODY} ${newMessageDedupeMarker("msg-xyz")}`,
      link: messageConversationLink("conv-abc"),
    });
    expect(payload.link).toBe("/messages?conversation=conv-abc");
  });

  it("includes dedupe marker per message id", () => {
    const a = buildNewMessageNotification("u1", "c1", "m1");
    const b = buildNewMessageNotification("u1", "c1", "m2");
    expect(a.message).toContain("[mid:m1]");
    expect(b.message).toContain("[mid:m2]");
    expect(a.message).not.toEqual(b.message);
  });

  it("strips internal markers for display", () => {
    expect(
      stripNotificationInternalMarkers(`${NEW_MESSAGE_BODY} [mid:uuid-1]`),
    ).toBe(NEW_MESSAGE_BODY);
  });

  it("sums unread counts for header badge", () => {
    expect(
      sumConversationUnreadCounts([
        { unread_count: 2 },
        { unread_count: 0 },
        { unread_count: 1 },
      ]),
    ).toBe(3);
  });
});
