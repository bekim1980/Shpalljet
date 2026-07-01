import { describe, expect, it } from "vitest";
import {
  adminReportListingPath,
  isListingReport,
  isUserBanned,
  isUserReport,
  isUserSuspended,
  reportStatusAuditAction,
} from "./adminReportModeration";

describe("adminReportModeration", () => {
  it("maps report workflow statuses to audit actions", () => {
    expect(reportStatusAuditAction("reviewed")).toBe("review_report");
    expect(reportStatusAuditAction("resolved")).toBe("resolve_report");
    expect(reportStatusAuditAction("pending")).toBeNull();
  });

  it("builds listing paths", () => {
    expect(adminReportListingPath("abc-123")).toBe("/product/abc-123");
  });

  it("detects report types", () => {
    expect(isListingReport("product")).toBe(true);
    expect(isUserReport("user")).toBe(true);
    expect(isListingReport("user")).toBe(false);
  });

  it("detects banned and suspended users", () => {
    const now = new Date("2026-06-30T12:00:00.000Z");
    expect(isUserBanned("2026-06-01T00:00:00.000Z")).toBe(true);
    expect(isUserSuspended("2026-07-01T00:00:00.000Z", now)).toBe(true);
    expect(isUserSuspended("2026-06-01T00:00:00.000Z", now)).toBe(false);
  });
});
