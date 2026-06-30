import { useState, useEffect, useCallback, useRef } from "react";
import type { Vertical } from "@/contexts/VerticalContext";

const DRAFT_KEY = "listing_draft";

export interface DraftData {
  selectedVertical: Vertical | null;
  title: string;
  description: string;
  price: string;
  pricePeriod: string;
  category: string;
  categoryId: string;
  subcategory: string;
  condition: string;
  brand: string;
  location: string;
  availability: string;
  providerProfile: string;
  serviceArea: string;
  contactMethod: string;
  currency: string;
  country: string;
  city: string;
  listingType: "free" | "paid";
  // Jobs fields
  companyName: string;
  jobType: string;
  salaryMin: string;
  salaryMax: string;
  jobLocation: string;
  experienceLevel: string;
  applicationEmail: string;
  applicationUrl: string;
}

const defaultDraft: DraftData = {
  selectedVertical: null,
  title: "",
  description: "",
  price: "",
  pricePeriod: "per-month",
  category: "",
  categoryId: "",
  subcategory: "",
  condition: "",
  brand: "",
  location: "",
  availability: "",
  providerProfile: "",
  serviceArea: "",
  contactMethod: "chat",
  currency: "",
  country: "",
  city: "",
  listingType: "free",
  companyName: "",
  jobType: "",
  salaryMin: "",
  salaryMax: "",
  jobLocation: "",
  experienceLevel: "",
  applicationEmail: "",
  applicationUrl: "",
};

export function useDraftListing() {
  const [draft, setDraft] = useState<DraftData>(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? { ...defaultDraft, ...JSON.parse(saved) } : defaultDraft;
    } catch {
      return defaultDraft;
    }
  });

  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, 500);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [draft]);

  const updateDraft = useCallback((updates: Partial<DraftData>) => {
    setDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY);
    setDraft(defaultDraft);
  }, []);

  return { draft, updateDraft, clearDraft };
}
