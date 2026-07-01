import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Camera, Loader2, Save, User, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/contexts/LocaleContext";
import { REGIONS } from "@/lib/currency";
import Header from "@/components/Header";
import MyListings from "@/components/MyListings";
import WishlistTab from "@/components/WishlistTab";
import { useAuth } from "@/hooks/useAuth";
import { useAccountRestriction } from "@/hooks/useAccountRestriction";
import { assertAccountCanMutate, getMutationErrorMessage } from "@/lib/accountRestriction";
import AccountRestrictedBanner from "@/components/AccountRestrictedBanner";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
);
const ViberIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.541 6.783.468 9.973.396 13.163.263 19.122 5.762 20.63h.004l-.004 2.379s-.037.963.598 1.159c.766.236 1.212-.492 1.943-1.283.401-.434.953-1.073 1.37-1.56 3.769.318 6.669-.41 6.999-.521.762-.257 5.073-.8 5.776-6.527.724-5.89-.343-9.618-2.27-11.308C18.845 1.762 15.439.06 11.4 0z" /></svg>
);

const isValidPhone = (phone: string): boolean => { if (!phone.trim()) return true; return /^\+[1-9]\d{6,14}$/.test(phone.replace(/[\s\-()]/g, "")); };

const Profile = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const { region, setRegion } = useLocale();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialTab = searchParams.get("tab") === "listings" || searchParams.get("tab") === "wishlist"
    ? (searchParams.get("tab") as string)
    : "profile";
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  // Sync tab from URL when it changes (e.g. from Insights deep link)
  useEffect(() => {
    const t = searchParams.get("tab");
    if (t && t !== activeTab) setActiveTab(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [viberEnabled, setViberEnabled] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [phoneError, setPhoneError] = useState("");

  const { restriction, isRestricted } = useAccountRestriction();

  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
      if (!error && data) {
        setDisplayName(data.display_name || "");
        setBio(data.bio || "");
        setPhoneNumber(data.phone_number || "");
        setAvatarUrl(data.avatar_url);
        setWhatsappEnabled(data.whatsapp_enabled ?? false);
        setViberEnabled(data.viber_enabled ?? false);
        setUserRegion(data.region || "");
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  if (authLoading) return null;
  if (!user) return (<div className="min-h-screen bg-background"><Header /><div className="container py-20 text-center space-y-4"><p className="text-muted-foreground font-display text-lg">{t("profile.loginRequired")}</p><Button variant="gold" onClick={() => navigate("/login")}>{t("common.login")}</Button></div></div>);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    if (isRestricted) { toast.error(restriction!.message); return; }
    setUploading(true);
    try {
      await assertAccountCanMutate(user.id);
      const ext = file.name.split(".").pop(); const path = `${user.id}/avatar.${ext}`; const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true }); if (uploadError) throw uploadError; const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path); const url = `${urlData.publicUrl}?t=${Date.now()}`; setAvatarUrl(url); await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id); toast.success(t("profile.avatarUpdated"));
    } catch (err: unknown) { toast.error(getMutationErrorMessage(err, t("profile.avatarFailed"))); } finally { setUploading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRestricted) { toast.error(restriction!.message); return; }
    const cleanPhone = phoneNumber.trim();
    if (cleanPhone && !isValidPhone(cleanPhone)) { setPhoneError(t("profile.phoneError")); return; }
    setPhoneError("");
    setSaving(true);
    try {
      await assertAccountCanMutate(user.id);
      const { error } = await supabase.from("profiles").update({ display_name: displayName.trim(), bio: bio.trim(), phone_number: cleanPhone || null, whatsapp_enabled: cleanPhone ? whatsappEnabled : false, viber_enabled: cleanPhone ? viberEnabled : false, region: userRegion || null }).eq("user_id", user.id);
      if (error) { toast.error(error.message); } else { toast.success(t("profile.profileUpdated")); if (userRegion) { setRegion(userRegion as any); } }
    } catch (err: unknown) {
      toast.error(getMutationErrorMessage(err, t("profile.saveFailed", "Dështoi ruajtja e profilit")));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (<div className="min-h-screen bg-background"><Header /><div className="container py-20 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></div>);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-lg py-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-2xl font-bold mb-6">{t("profile.title")}</h1>
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); const next = new URLSearchParams(searchParams); next.set("tab", v); setSearchParams(next, { replace: true }); }} className="space-y-6">
            <TabsList className="w-full">
              <TabsTrigger value="profile" className="flex-1">{t("profile.profileTab")}</TabsTrigger>
              <TabsTrigger value="listings" className="flex-1">{t("profile.listingsTab")}</TabsTrigger>
              <TabsTrigger value="wishlist" className="flex-1">{t("profile.wishlistTab")}</TabsTrigger>
            </TabsList>
            <TabsContent value="profile">
              <form onSubmit={handleSave} className="space-y-6">
                <AccountRestrictedBanner restriction={restriction} />
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-border">{avatarUrl ? (<img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />) : (<User className="h-10 w-10 text-muted-foreground" />)}</div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:opacity-90 transition-opacity">{uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}</button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("profile.avatarHint")}</p>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <div className="space-y-2"><Label htmlFor="displayName">{t("profile.displayName")}</Label><Input id="displayName" placeholder={t("profile.displayNamePlaceholder")} className="bg-secondary/50" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={50} /></div>
                <div className="space-y-2"><Label>{t("profile.email")}</Label><Input value={user.email || ""} disabled className="bg-secondary/30 text-muted-foreground" /></div>
                <div className="space-y-2"><Label htmlFor="phone">{t("profile.phone")}</Label><div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="phone" type="tel" placeholder={t("profile.phonePlaceholder")} className={`pl-9 bg-secondary/50 ${phoneError ? "border-destructive" : ""}`} value={phoneNumber} onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(""); }} maxLength={20} /></div>{phoneError ? (<p className="text-xs text-destructive">{phoneError}</p>) : (<p className="text-xs text-muted-foreground">{t("profile.phoneFormat")}</p>)}</div>

                {/* Region */}
                <div className="space-y-2">
                  <Label>{t("profile.region")}</Label>
                  <Select value={userRegion} onValueChange={setUserRegion}>
                    <SelectTrigger className="bg-secondary/50"><SelectValue placeholder={t("profile.selectRegion")} /></SelectTrigger>
                    <SelectContent>{REGIONS.map((r) => (<SelectItem key={r.value} value={r.value}>{t(r.labelKey)}</SelectItem>))}</SelectContent>
                  </Select>
                </div>

                {phoneNumber.trim() && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between glass-card rounded-lg p-4"><div className="flex items-center gap-3"><WhatsAppIcon className="h-5 w-5 text-[#25D366]" /><div><p className="text-sm font-medium">{t("profile.whatsapp")}</p><p className="text-xs text-muted-foreground">{t("profile.whatsappDesc")}</p></div></div><Switch checked={whatsappEnabled} onCheckedChange={setWhatsappEnabled} /></div>
                    <div className="flex items-center justify-between glass-card rounded-lg p-4"><div className="flex items-center gap-3"><ViberIcon className="h-5 w-5 text-[#7360F2]" /><div><p className="text-sm font-medium">{t("profile.viber")}</p><p className="text-xs text-muted-foreground">{t("profile.viberDesc")}</p></div></div><Switch checked={viberEnabled} onCheckedChange={setViberEnabled} /></div>
                  </div>
                )}
                <div className="space-y-2"><Label htmlFor="bio">{t("profile.bio")}</Label><Textarea id="bio" placeholder={t("profile.bioPlaceholder")} className="bg-secondary/50 min-h-[100px]" value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} /></div>
                <Button variant="gold" className="w-full" type="submit" disabled={saving || isRestricted}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-2" />{t("profile.saveChanges")}</>}</Button>
              </form>
            </TabsContent>
            <TabsContent value="listings"><MyListings /></TabsContent>
            <TabsContent value="wishlist"><WishlistTab /></TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
};

export default Profile;
