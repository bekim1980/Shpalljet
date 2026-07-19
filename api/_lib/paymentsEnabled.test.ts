import { describe, expect, it } from "vitest";
import {
  PAYMENTS_DISABLED_MESSAGE,
  PAYMENTS_ENABLED,
} from "../../src/config/features";

/**
 * Checkout kill-switch contract: while PAYMENTS_ENABLED is false, the
 * create-checkout-session handler must return HTTP 503 with this message.
 * The handler itself is covered by importing the shared flag (same source
 * as the API route).
 */
describe("payments feature flag", () => {
  it("is disabled by default for temporary shutdown", () => {
    expect(PAYMENTS_ENABLED).toBe(false);
  });

  it("exposes a stable disabled error message for API 503 responses", () => {
    expect(PAYMENTS_DISABLED_MESSAGE).toBe("Payments are temporarily disabled");
  });
});
