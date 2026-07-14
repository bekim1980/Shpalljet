import LegalDocumentLayout from "@/components/legal/LegalDocumentLayout";
import { PRIVACY_SECTION_IDS } from "@/config/legalSections";

const Privacy = () => (
  <LegalDocumentLayout documentKey="privacy" sectionIds={PRIVACY_SECTION_IDS} canonicalPath="/privacy" />
);

export default Privacy;
