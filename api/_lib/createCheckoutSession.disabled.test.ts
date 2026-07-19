import { describe, expect, it, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { PAYMENTS_DISABLED_MESSAGE } from "../../src/config/features";
import handler from "../stripe/create-checkout-session";

function mockRes() {
  const res = {
    statusCode: 0,
    body: null as unknown,
    headers: {} as Record<string, string>,
    setHeader(k: string, v: string) {
      this.headers[k] = v;
      return this;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    end() {
      return this;
    },
  };
  return res as typeof res & VercelResponse;
}

describe("POST /api/stripe/create-checkout-session while payments disabled", () => {
  it("returns 503 with Payments are temporarily disabled", async () => {
    const req = {
      method: "POST",
      headers: {},
      body: { productId: "x", entitlementType: "premium" },
    } as unknown as VercelRequest;
    const res = mockRes();

    await handler(req, res);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: PAYMENTS_DISABLED_MESSAGE });
  });

  it("still answers CORS preflight", async () => {
    const req = { method: "OPTIONS", headers: {} } as unknown as VercelRequest;
    const res = mockRes();
    const end = vi.fn();
    (res as { end: typeof end }).end = end;

    await handler(req, res);

    expect(res.statusCode).toBe(204);
  });
});
