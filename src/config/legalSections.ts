export const TERMS_SECTION_IDS = [
  "introduction",
  "eligibility",
  "accounts",
  "listings",
  "marketplaceRules",
  "payments",
  "userConduct",
  "intellectualProperty",
  "suspension",
  "disclaimer",
  "contact",
] as const;

export const PRIVACY_SECTION_IDS = [
  "informationCollected",
  "accountInformation",
  "cookies",
  "analytics",
  "googleSignIn",
  "deviceInformation",
  "storage",
  "sharing",
  "security",
  "gdprRights",
  "contact",
] as const;

export type TermsSectionId = (typeof TERMS_SECTION_IDS)[number];
export type PrivacySectionId = (typeof PRIVACY_SECTION_IDS)[number];
