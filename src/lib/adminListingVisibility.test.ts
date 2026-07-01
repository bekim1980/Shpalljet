import { describe, expect, it } from "vitest";
import {
  listingVisibilityAuditAction,
  listingVisibilityStatus,
  shouldShowHideListing,
  shouldShowUnhideListing,
} from "./adminListingVisibility";

describe("adminListingVisibility", () => {
  it("maps hide to inactive and unhide to active", () => {
    expect(listingVisibilityStatus(false)).toBe("inactive");
    expect(listingVisibilityStatus(true)).toBe("active");
  });

  it("maps visibility to audit actions", () => {
    expect(listingVisibilityAuditAction(false)).toBe("hide_listing");
    expect(listingVisibilityAuditAction(true)).toBe("unhide_listing");
  });

  it("shows hide only for active listings", () => {
    expect(shouldShowHideListing("active")).toBe(true);
    expect(shouldShowHideListing("inactive")).toBe(false);
    expect(shouldShowHideListing("pending")).toBe(false);
  });

  it("shows unhide only for inactive listings", () => {
    expect(shouldShowUnhideListing("inactive")).toBe(true);
    expect(shouldShowUnhideListing("active")).toBe(false);
    expect(shouldShowUnhideListing("pending")).toBe(false);
  });
});
