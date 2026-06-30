import type { Vertical } from "@/contexts/VerticalContext";

export type AiCondition =
  | "new"
  | "like-new"
  | "excellent"
  | "good"
  | "fair"
  | "for-parts"
  | "unknown";

export interface AiListingAttribute {
  key: string;
  value: string;
  confidence: number;
}

export interface AiMissingField {
  field: string;
  label: string;
  reason: string;
  input_type?: "text" | "select" | "number";
  options?: Array<{ label: string; value: string }>;
}

export interface AiDisambiguation {
  field: string;
  message: string;
  confidence: number;
  options: Array<{ label: string; value: string }>;
}

/** Structured vision analysis — never includes price. */
export interface AiListingAnalysis {
  vertical: Vertical;
  vertical_confidence: number;
  category: string;
  category_confidence: number;
  subcategory?: string;
  subcategory_confidence?: number;
  title: string;
  title_confidence: number;
  description: string;
  brand?: string;
  brand_confidence?: number;
  model?: string;
  model_confidence?: number;
  condition: AiCondition;
  condition_confidence: number;
  attributes: AiListingAttribute[];
  tags: string[];
  missing_fields: AiMissingField[];
  disambiguation: AiDisambiguation[];
  recognition_summary: string;
  overall_confidence: number;
  image_quality_notes?: string[];
}

export type AiAnalysisStep =
  | "identifying"
  | "brand"
  | "attributes"
  | "title"
  | "description"
  | "preparing";

export const AI_ANALYSIS_STEPS: AiAnalysisStep[] = [
  "identifying",
  "brand",
  "attributes",
  "title",
  "description",
  "preparing",
];
