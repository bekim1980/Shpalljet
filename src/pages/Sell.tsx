import { useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2, DollarSign, Tag, FileText, MapPin, Crown, Store, Home, Briefcase, BriefcaseBusiness,
  Package, MessageSquare, Phone, Send, Clock, Sparkles, Mail, Link as LinkIcon, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/contexts/LocaleContext";
import { SUPPORTED_CURRENCIES, COUNTRIES } from "@/lib/currency";
import Header from "@/components/Header";
import ImageUploader from "@/components/ImageUploader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VERTICALS, type Vertical } from "@/contexts/VerticalContext";
import { VERTICAL_CATEGORIES, CONDITIONS, PRICE_PERIODS, CONTACT_METHODS, JOB_TYPES, EXPERIENCE_LEVELS } from "@/data/verticalConfig";
import { useDraftListing } from "@/hooks/useDraftListing";
import { useCategories } from "@/hooks/useCategories";
import SmartListingHelper, { type ListingSuggestion } from "@/components/ai/SmartListingHelper";
import AiListingCreator from "@/components/ai/aiListing/AiListingCreator";
import { ENABLE_AI_ASSISTANT, ENABLE_AI_LISTING_CREATOR } from "@/config/features";
import { useListingAiGeneration } from "@/hooks/useListingAiGeneration";
import { enrichDescriptionWithAiMeta } from "@/lib/aiListingMapper";
import type { AiListingAnalysis } from "@/types/aiListing";

const verticalIcons: Record<Vertical, React.ElementType> = { luxe: Crown, market: Store, rent: Home, services: Briefcase, jobs: BriefcaseBusiness };
const contactIcons: Record<string, React.ElementType> = { chat: MessageSquare, phone: Phone, whatsapp: Send, viber: Phone };

const compressImage = (file: File, maxDim: number, quality: number): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not supported")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (b) => { if (b) resolve(b); else reject(new Error("Compression failed")); },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });

const Sell = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { currency: defaultCurrency } = useLocale();
  const { draft, updateDraft, clearDraft } = useDraftListing();
  const queryClient = useQueryClient();
  const { data: dbCategories } = useCategories();

  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creationMode, setCreationMode] = useState<"manual" | "ai">("manual");
  const [aiUserNotes, setAiUserNotes] = useState("");

  const categoryIdForSlug = useCallback(
    (slug: string) => dbCategories?.find((c) => c.slug === slug)?.id ?? "",
    [dbCategories],
  );
  const { generateFromImages, loading: aiGenerating, error: aiGenerateError } =
    useListingAiGeneration(categoryIdForSlug);

  if (authLoading) return null;
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center space-y-4">
          <p className="text-muted-foreground font-display text-lg">{t("sell.loginRequired")}</p>
          <Button variant="gold" onClick={() => navigate("/login", { state: { from: "/sell" } })}>{t("common.login")}</Button>
        </div>
      </div>
    );
  }

  const handleImagesChange = (newImages: File[], newPreviews: string[]) => { setImages(newImages); setPreviews(newPreviews); };

  const handleGenerateWithAi = async () => {
    if (images.length === 0) {
      setErrors((prev) => ({ ...prev, images: t("sell.imageRequired", "Please add at least one image") }));
      return;
    }
    const result = await generateFromImages(images, aiUserNotes.trim() || undefined);
    if (result) {
      updateDraft(result.draftPatch);
      toast.success(t("aiListing.generated"));
    }
  };

  const validate = (_opts?: { fromAi?: boolean }): boolean => {
    const errs: Record<string, string> = {};
    if (!draft.selectedVertical) errs.vertical = t("sell.selectSection");
    if (!draft.title.trim()) errs.title = t("sell.titleRequired");
    if (!draft.category) errs.category = t("sell.selectCategory");
    if (draft.selectedVertical !== "jobs" && images.length === 0) {
      errs.images = t("sell.imageRequired", "Please add at least one image");
    }
    if (draft.selectedVertical === "luxe" || draft.selectedVertical === "market") {
      if (!draft.price) errs.price = t("sell.setPrice");
      if (!draft.condition) errs.condition = t("sell.selectCondition");
    }
    if (draft.selectedVertical === "rent") { if (!draft.price) errs.price = t("sell.setPrice"); }
    if (draft.selectedVertical === "jobs") {
      if (!draft.companyName.trim()) errs.companyName = t("sell.companyRequired", "Company name is required");
      if (!draft.jobType) errs.jobType = t("sell.jobTypeRequired", "Select job type");
      if (!draft.applicationEmail.trim() && !draft.applicationUrl.trim()) {
        errs.applicationEmail = t("sell.applicationRequired", "Provide an application email or URL");
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e?: React.FormEvent, aiMeta?: AiListingAnalysis | null, missingAnswers?: Record<string, string>) => {
    e?.preventDefault();
    if (!validate({ fromAi: !!aiMeta })) { toast.error(t("sell.fillRequired")); return; }
    setSubmitting(true);
    try {
      let description = draft.description.trim();
      if (aiMeta) {
        const extraAttrs = [
          ...aiMeta.attributes.filter((a) => a.confidence >= 50),
          ...Object.entries(missingAnswers ?? {})
            .filter(([, v]) => v.trim())
            .map(([key, value]) => ({ key, value })),
        ];
        if (aiMeta.model?.trim()) {
          extraAttrs.push({ key: "model", value: aiMeta.model });
        }
        description = enrichDescriptionWithAiMeta(description, aiMeta.tags, extraAttrs);
      }
      const imageUrls: string[] = [];
      for (const file of images) {
        try {
          const compressed = await compressImage(file, 1920, 0.8);
          const path = `${user.id}/${crypto.randomUUID()}.jpg`;
          const { error: uploadError } = await supabase.storage.from("product-images").upload(path, compressed, { contentType: "image/jpeg" });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);
          imageUrls.push(urlData.publicUrl);
        } catch (imgErr: any) {
          console.error("Image upload failed:", imgErr);
          toast.error(t("sell.imageUploadFailed", "Ngarkimi i fotos dështoi: ") + (imgErr.message || ""));
          setSubmitting(false);
          return;
        }
      }
      // Calculate expires_at based on listing type
      const now = new Date();
      const daysToAdd = draft.listingType === "paid" ? 30 : 7;
      const expiresAt = new Date(now.getTime() + daysToAdd * 24 * 60 * 60 * 1000).toISOString();

      const insertData: any = {
        seller_id: user.id, title: draft.title.trim(), description,
        price: parseFloat(draft.price) || 0, category: draft.category, category_id: draft.categoryId || null,
        vertical: draft.selectedVertical, image_urls: imageUrls, location: draft.location.trim() || null,
        contact_method: draft.contactMethod, currency: draft.currency || defaultCurrency,
        country: draft.country || null, city: draft.city || null,
        listing_type: draft.listingType, expires_at: expiresAt,
      };
      if (draft.selectedVertical === "luxe" || draft.selectedVertical === "market") {
        insertData.condition = draft.condition;
        if (draft.selectedVertical === "luxe") insertData.brand = draft.brand.trim() || null;
      }
      if (draft.selectedVertical === "rent") { insertData.price_period = draft.pricePeriod; insertData.rental_period = draft.pricePeriod; insertData.availability = draft.availability.trim() || null; }
      if (draft.selectedVertical === "services") { insertData.price_period = draft.pricePeriod; insertData.service_category = draft.category; insertData.provider_profile = draft.providerProfile.trim() || null; insertData.service_area = draft.serviceArea.trim() || null; }
      if (draft.selectedVertical === "jobs") {
        insertData.company_name = draft.companyName.trim();
        insertData.job_type = draft.jobType;
        insertData.salary_min = draft.salaryMin ? parseFloat(draft.salaryMin) : null;
        insertData.salary_max = draft.salaryMax ? parseFloat(draft.salaryMax) : null;
        insertData.job_location = draft.jobLocation.trim() || null;
        insertData.experience_level = draft.experienceLevel || null;
        insertData.application_email = draft.applicationEmail.trim() || null;
        insertData.application_url = draft.applicationUrl.trim() || null;
        // Jobs don't need a price; ensure non-null
        insertData.price = insertData.price || 0;
        // Skip strict condition for jobs
        insertData.condition = "used";
      }
      if (draft.selectedVertical === "luxe") { insertData.moderation_status = "pending"; insertData.status = "pending"; }
      const { error } = await supabase.from("products").insert(insertData);
      if (error) throw error;
      clearDraft();
      setCreationMode("manual");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["trending-preview"] });
      if (draft.selectedVertical === "luxe") { toast.success(t("sell.pendingModeration")); } else { toast.success(t("sell.listingSuccess")); }
      navigate("/profile");
    } catch (err: any) { toast.error(err.message || t("sell.listingFailed")); } finally { setSubmitting(false); }
  };

  const v = draft.selectedVertical;
  const categories = v ? VERTICAL_CATEGORIES[v] : [];
  const FieldError = ({ field }: { field: string }) => errors[field] ? <p className="text-xs text-destructive mt-1">{errors[field]}</p> : null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-lg py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-1">{t("sell.title")}</h1>
          <p className="text-muted-foreground text-sm mb-6">{t("sell.subtitle")}</p>

          {ENABLE_AI_LISTING_CREATOR && creationMode === "manual" && (
            <button
              type="button"
              onClick={() => setCreationMode("ai")}
              className="w-full mb-6 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent p-4 text-left transition-all hover:border-primary/50 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/20">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-display font-bold text-base">{t("aiListing.entryCta")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t("aiListing.entrySubtitle")}</p>
                </div>
                <Sparkles className="h-4 w-4 text-primary/60 shrink-0" />
              </div>
            </button>
          )}

          {ENABLE_AI_LISTING_CREATOR && creationMode === "ai" ? (
            <AiListingCreator
              draft={draft}
              onDraftChange={updateDraft}
              categoryIdForSlug={categoryIdForSlug}
              images={images}
              previews={previews}
              onImagesChange={handleImagesChange}
              errors={errors}
              submitting={submitting}
              onPublish={(analysis, missingAnswers) => {
                handleSubmit(undefined, analysis, missingAnswers);
              }}
              onExit={() => setCreationMode("manual")}
              defaultCurrency={defaultCurrency}
              locale={i18n.language}
            />
          ) : (
          <form onSubmit={(e) => handleSubmit(e)} className="space-y-5">
            {/* Section picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("sell.section")} *</Label>
              <div className="grid grid-cols-5 gap-2">
                {VERTICALS.map((vert) => {
                  const Icon = verticalIcons[vert.value];
                  const selected = v === vert.value;
                  return (
                    <button key={vert.value} type="button" onClick={() => {
                      if (v && v !== vert.value && draft.category) {
                        if (!window.confirm(t("sell.switchVerticalConfirm", "Switching section will reset your category. Continue?"))) return;
                      }
                      updateDraft({ selectedVertical: vert.value, category: "", condition: "" });
                    }}
                      className={`p-3 rounded-xl border text-center transition-all ${selected ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:border-primary/40"}`}>
                      <Icon className={`h-5 w-5 mx-auto mb-1.5 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-[11px] font-display font-bold block ${selected ? "text-primary" : "text-foreground"}`}>{vert.label}</span>
                    </button>
                  );
                })}
              </div>
              <FieldError field="vertical" />
            </div>

            <ImageUploader images={images} previews={previews} onImagesChange={handleImagesChange} />
            <FieldError field="images" />

            {ENABLE_AI_LISTING_CREATOR && (
              <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-4">
                <div className="space-y-2">
                  <Label htmlFor="ai-notes">{t("aiListing.userNotes")}</Label>
                  <Textarea
                    id="ai-notes"
                    placeholder={t("aiListing.userNotesPlaceholder")}
                    className="bg-secondary/50 min-h-[72px] text-sm"
                    value={aiUserNotes}
                    onChange={(e) => setAiUserNotes(e.target.value)}
                    maxLength={500}
                  />
                </div>
                {aiGenerateError && (
                  <p className="text-sm text-destructive">
                    {aiGenerateError === "rate_limit"
                      ? t("ai.rateLimit")
                      : aiGenerateError === "not_configured"
                        ? t("aiListing.notConfigured")
                        : t("aiListing.analysisFailed")}
                  </p>
                )}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full border-primary/40"
                  disabled={aiGenerating || images.length === 0}
                  onClick={handleGenerateWithAi}
                >
                  {aiGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t("aiListing.generating")}
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      {t("aiListing.generateWithAi")}
                    </>
                  )}
                </Button>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t("sell.titleField")} *</Label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="title" placeholder={v === "services" ? t("sell.placeholders.serviceTitle") : v === "rent" ? t("sell.placeholders.rentTitle") : t("sell.placeholders.luxeTitle")} className="pl-9 bg-secondary/50" value={draft.title} onChange={(e) => updateDraft({ title: e.target.value })} maxLength={100} />
              </div>
              <FieldError field="title" />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">{t("sell.description")}</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea id="description" placeholder={v === "services" ? t("sell.placeholders.serviceDesc") : v === "rent" ? t("sell.placeholders.rentDesc") : t("sell.placeholders.luxeDesc")} className="pl-9 bg-secondary/50 min-h-[100px]" value={draft.description} onChange={(e) => updateDraft({ description: e.target.value })} maxLength={2000} />
              </div>
            </div>

            {ENABLE_AI_ASSISTANT && <SmartListingHelper
              title={draft.title}
              description={draft.description}
              vertical={v ?? ""}
              onApply={(s: ListingSuggestion) => {
                const patch: Partial<typeof draft> = {
                  title: s.improved_title || draft.title,
                  description: s.improved_description || draft.description,
                };
                if (s.vertical && !draft.selectedVertical) patch.selectedVertical = s.vertical;
                if (s.currency && !draft.currency) patch.currency = s.currency;
                if (!draft.price && s.suggested_price_min && s.suggested_price_max) {
                  patch.price = String(Math.round((s.suggested_price_min + s.suggested_price_max) / 2));
                }
                updateDraft(patch);
              }}
            />}
            {(v === "luxe" || v === "market" || v === "rent") && (
              <div className={`grid gap-4 ${v === "rent" ? "grid-cols-3" : "grid-cols-2"}`}>
                <div className="space-y-2">
                  <Label htmlFor="price">{t("sell.price")} *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="price" type="number" step="0.01" min="0" placeholder="0.00" className="pl-9 bg-secondary/50" value={draft.price} onChange={(e) => updateDraft({ price: e.target.value })} />
                  </div>
                  <FieldError field="price" />
                </div>
                <div className="space-y-2">
                  <Label>{t("sell.currency")}</Label>
                  <Select value={draft.currency || defaultCurrency} onValueChange={(val) => updateDraft({ currency: val })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_CURRENCIES.map((c) => (<SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                {v === "rent" && (
                  <div className="space-y-2">
                    <Label>{t("sell.period")}</Label>
                    <Select value={draft.pricePeriod} onValueChange={(val) => updateDraft({ pricePeriod: val })}>
                      <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                      <SelectContent>{PRICE_PERIODS.map((p) => (<SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}

            {v === "services" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">{t("sell.startingPrice")}</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="price" type="number" step="0.01" min="0" placeholder="0.00" className="pl-9 bg-secondary/50" value={draft.price} onChange={(e) => updateDraft({ price: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("sell.currency")}</Label>
                  <Select value={draft.currency || defaultCurrency} onValueChange={(val) => updateDraft({ currency: val })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue /></SelectTrigger>
                    <SelectContent>{SUPPORTED_CURRENCIES.map((c) => (<SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Category */}
            {v && (
              <div className="space-y-2">
                <Label>{v === "services" ? t("sell.serviceCategory") + " *" : v === "rent" ? t("sell.rentCategory") + " *" : t("sell.category") + " *"}</Label>
                <Select value={draft.category} onValueChange={(val) => { const matchedCat = dbCategories?.find(c => c.slug === val); updateDraft({ category: val, categoryId: matchedCat?.id || "", subcategory: "" }); }}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder={t("sell.select")} /></SelectTrigger>
                  <SelectContent>{categories.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent>
                </Select>
                <FieldError field="category" />
              </div>
            )}

            {/* Subcategory */}
            {v && draft.category && (() => {
              const parentCat = categories.find(c => c.value === draft.category);
              const subs = parentCat?.subcategories;
              if (!subs || subs.length === 0) return null;
              return (
                <div className="space-y-2">
                  <Label>{t("sell.subcategory")}</Label>
                  <Select value={draft.subcategory || ""} onValueChange={(val) => updateDraft({ subcategory: val })}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder={t("sell.subcategoryPlaceholder")} /></SelectTrigger>
                    <SelectContent>{subs.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              );
            })()}

            {/* Condition */}
            {(v === "luxe" || v === "market") && (
              <div className="space-y-2">
                <Label>{t("sell.condition")} *</Label>
                <Select value={draft.condition} onValueChange={(val) => updateDraft({ condition: val })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder={t("sell.select")} /></SelectTrigger>
                  <SelectContent>{CONDITIONS.map((c) => (<SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>))}</SelectContent>
                </Select>
                <FieldError field="condition" />
              </div>
            )}

            {v === "luxe" && (
              <div className="space-y-2">
                <Label htmlFor="brand">{t("sell.brand")}</Label>
                <Input id="brand" placeholder={t("sell.brandPlaceholder")} className="bg-secondary/50" value={draft.brand} onChange={(e) => updateDraft({ brand: e.target.value })} />
              </div>
            )}

            {v === "rent" && (
              <div className="space-y-2">
                <Label htmlFor="availability">{t("sell.availability")}</Label>
                <Input id="availability" placeholder={t("sell.availabilityPlaceholder")} className="bg-secondary/50" value={draft.availability} onChange={(e) => updateDraft({ availability: e.target.value })} />
              </div>
            )}

            {v === "services" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="serviceArea">{t("sell.serviceArea")}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="serviceArea" placeholder={t("sell.serviceAreaPlaceholder")} className="pl-9 bg-secondary/50" value={draft.serviceArea} onChange={(e) => updateDraft({ serviceArea: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="providerProfile">{t("sell.providerProfile")}</Label>
                  <Textarea id="providerProfile" placeholder={t("sell.placeholders.providerDesc")} className="bg-secondary/50 min-h-[80px]" value={draft.providerProfile} onChange={(e) => updateDraft({ providerProfile: e.target.value })} maxLength={1000} />
                </div>
              </>
            )}

            {/* Jobs-specific fields */}
            {v === "jobs" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="companyName">{t("sell.companyName", "Company name")} *</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="companyName" className="pl-9 bg-secondary/50" value={draft.companyName} onChange={(e) => updateDraft({ companyName: e.target.value })} maxLength={120} />
                  </div>
                  <FieldError field="companyName" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("sell.jobType", "Job type")} *</Label>
                    <Select value={draft.jobType} onValueChange={(val) => updateDraft({ jobType: val })}>
                      <SelectTrigger className="bg-secondary/50"><SelectValue placeholder={t("sell.select")} /></SelectTrigger>
                      <SelectContent>{JOB_TYPES.map((j) => (<SelectItem key={j.value} value={j.value}>{j.label}</SelectItem>))}</SelectContent>
                    </Select>
                    <FieldError field="jobType" />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("sell.experienceLevel", "Experience level")}</Label>
                    <Select value={draft.experienceLevel} onValueChange={(val) => updateDraft({ experienceLevel: val })}>
                      <SelectTrigger className="bg-secondary/50"><SelectValue placeholder={t("sell.select")} /></SelectTrigger>
                      <SelectContent>{EXPERIENCE_LEVELS.map((e) => (<SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">{t("sell.salaryMin", "Salary min")}</Label>
                    <Input id="salaryMin" type="number" min="0" step="0.01" className="bg-secondary/50" value={draft.salaryMin} onChange={(e) => updateDraft({ salaryMin: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">{t("sell.salaryMax", "Salary max")}</Label>
                    <Input id="salaryMax" type="number" min="0" step="0.01" className="bg-secondary/50" value={draft.salaryMax} onChange={(e) => updateDraft({ salaryMax: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="jobLocation">{t("sell.jobLocation", "Job location")}</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="jobLocation" placeholder="Tirana, remote, hybrid…" className="pl-9 bg-secondary/50" value={draft.jobLocation} onChange={(e) => updateDraft({ jobLocation: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationEmail">{t("sell.applicationEmail", "Application email")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="applicationEmail" type="email" placeholder="hr@company.com" className="pl-9 bg-secondary/50" value={draft.applicationEmail} onChange={(e) => updateDraft({ applicationEmail: e.target.value })} />
                  </div>
                  <FieldError field="applicationEmail" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applicationUrl">{t("sell.applicationUrl", "Application URL")}</Label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="applicationUrl" type="url" placeholder="https://…" className="pl-9 bg-secondary/50" value={draft.applicationUrl} onChange={(e) => updateDraft({ applicationUrl: e.target.value })} />
                  </div>
                </div>
              </>
            )}

            {/* Country + City */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("sell.country")}</Label>
                <Select value={draft.country || ""} onValueChange={(val) => updateDraft({ country: val })}>
                  <SelectTrigger className="bg-secondary/50"><SelectValue placeholder={t("sell.select")} /></SelectTrigger>
                  <SelectContent>{COUNTRIES.map((c) => (<SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">{t("sell.city")}</Label>
                <Input id="city" placeholder={t("sell.cityPlaceholder")} className="bg-secondary/50" value={draft.city || ""} onChange={(e) => updateDraft({ city: e.target.value })} />
              </div>
            </div>

            {/* Location (legacy) */}
            <div className="space-y-2">
              <Label htmlFor="location">{t("sell.location")}</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="location" placeholder={t("sell.locationPlaceholder")} className="pl-9 bg-secondary/50" value={draft.location} onChange={(e) => updateDraft({ location: e.target.value })} />
              </div>
            </div>

            {/* Contact method */}
            <div className="space-y-2">
              <Label>{t("sell.contactMethod")}</Label>
              <div className="grid grid-cols-4 gap-2">
                {CONTACT_METHODS.map((cm) => {
                  const Icon = contactIcons[cm.value];
                  const selected = draft.contactMethod === cm.value;
                  return (
                    <button key={cm.value} type="button" onClick={() => updateDraft({ contactMethod: cm.value })}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-all ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}>
                      <Icon className="h-4 w-4" />{cm.label}
                    </button>
                  );
                })}
              </div>
              {(draft.contactMethod === "phone" || draft.contactMethod === "whatsapp" || draft.contactMethod === "viber") && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {t("sell.phoneFromProfile", "Numri i telefonit do të merret nga profili juaj. Sigurohuni që ta keni vendosur në faqen e Profilit.")}
                </p>
              )}
            </div>

            {/* Listing Type */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t("sell.listingType")} *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => updateDraft({ listingType: "free" })}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    draft.listingType === "free"
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <Clock className={`h-5 w-5 mx-auto mb-1.5 ${draft.listingType === "free" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-display font-bold block ${draft.listingType === "free" ? "text-primary" : "text-foreground"}`}>
                    {t("sell.freeListing")}
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-1">{t("sell.freeTag")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateDraft({ listingType: "paid" })}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    draft.listingType === "paid"
                      ? "border-primary bg-primary/10 ring-1 ring-primary"
                      : "border-border bg-card hover:border-primary/40"
                  }`}
                >
                  <Sparkles className={`h-5 w-5 mx-auto mb-1.5 ${draft.listingType === "paid" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-display font-bold block ${draft.listingType === "paid" ? "text-primary" : "text-foreground"}`}>
                    {t("sell.paidListing")}
                  </span>
                  <span className="text-[11px] text-muted-foreground block mt-1">{t("sell.paidTag")}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground/60 text-center">{t("sell.draftAutoSaved")}</p>

            <Button variant="gold" className="w-full" type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Package className="h-4 w-4 mr-2" />{t("sell.publish")}</>}
            </Button>
          </form>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Sell;
