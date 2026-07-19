// Feature flags for production launch.
// Toggle these to enable/disable in-progress features.
export const ENABLE_AI_ASSISTANT = false;

/** Flagship photo → listing flow (vision analysis). Independent of chat/search AI. */
export const ENABLE_AI_LISTING_CREATOR = true;

/**
 * Master switch for listing payments (Premium, Boost, paid renew, Stripe checkout).
 * Set to `true` to re-enable purchase UI and checkout. Existing entitlements
 * continue to display/expire regardless of this flag. Not user-editable.
 */
export const PAYMENTS_ENABLED = false;

/** HTTP 503 body from checkout while payments are shut down. */
export const PAYMENTS_DISABLED_MESSAGE = "Payments are temporarily disabled";
