import LegalDocumentLayout from "@/components/legal/LegalDocumentLayout";
import { TERMS_SECTION_IDS } from "@/config/legalSections";

const Terms = () => (
  <LegalDocumentLayout documentKey="terms" sectionIds={TERMS_SECTION_IDS} canonicalPath="/terms" />
);

export default Terms;
