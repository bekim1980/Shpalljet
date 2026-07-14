import type { ReactNode } from "react";

const LEGAL_EMAIL_PATTERN = /(legal@shpalljet\.net|privacy@shpalljet\.net|abuse@shpalljet\.net)/g;

const LEGAL_EMAILS = new Set(["legal@shpalljet.net", "privacy@shpalljet.net", "abuse@shpalljet.net"]);

const emailLinkClass =
  "text-gold hover:text-gold/80 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-sm";

/** Renders legal copy with known contact emails as mailto links (locale strings unchanged). */
export function linkLegalEmails(text: string): ReactNode {
  const parts = text.split(LEGAL_EMAIL_PATTERN);
  if (parts.length === 1) return text;

  return parts.map((part, index) => {
    if (LEGAL_EMAILS.has(part)) {
      return (
        <a key={index} href={`mailto:${part}`} className={emailLinkClass}>
          {part}
        </a>
      );
    }
    return part;
  });
}

export const tocLinkFocusClass =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background";
