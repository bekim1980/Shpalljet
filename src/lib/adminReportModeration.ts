export type ReportWorkflowStatus = "pending" | "reviewed" | "resolved";

export type ReportStatusAuditAction = "review_report" | "resolve_report";

export function reportStatusAuditAction(status: string): ReportStatusAuditAction | null {
  if (status === "reviewed") return "review_report";
  if (status === "resolved") return "resolve_report";
  return null;
}

export function adminReportListingPath(productId: string): string {
  return `/product/${productId}`;
}

export function isListingReport(reportedType: string): boolean {
  return reportedType === "product";
}

export function isUserReport(reportedType: string): boolean {
  return reportedType === "user";
}

export function isUserBanned(bannedAt: string | null | undefined): boolean {
  return !!bannedAt;
}

export function isUserSuspended(
  suspendedUntil: string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!suspendedUntil) return false;
  return new Date(suspendedUntil).getTime() > now.getTime();
}
