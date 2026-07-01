export type ListingVisibilityStatus = "active" | "inactive";

export type ListingVisibilityAuditAction = "hide_listing" | "unhide_listing";

export function listingVisibilityStatus(visible: boolean): ListingVisibilityStatus {
  return visible ? "active" : "inactive";
}

export function listingVisibilityAuditAction(visible: boolean): ListingVisibilityAuditAction {
  return visible ? "unhide_listing" : "hide_listing";
}

export function shouldShowHideListing(status: string): boolean {
  return status === "active";
}

export function shouldShowUnhideListing(status: string): boolean {
  return status === "inactive";
}
