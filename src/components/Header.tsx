import { Link } from "react-router-dom";
import { User, MessageCircle, ShoppingBag, LogOut, Plus, ShieldCheck, Package, BarChart3, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useAdmin";
import { useUnreadMessageCount } from "@/hooks/useUnreadMessageCount";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/contexts/LocaleContext";
import { REGIONS, SUPPORTED_CURRENCIES } from "@/lib/currency";
import NotificationsDropdown from "@/components/NotificationsDropdown";

const Header = () => {
  const { user, signOut } = useAuth();
  const { data: isAdmin } = useIsAdmin();
  const { unreadCount: messageUnreadCount } = useUnreadMessageCount();
  const { t, i18n } = useTranslation();
  const { region, setRegion, currency, setCurrency } = useLocale();

  const currentLang = i18n.language?.startsWith("en") ? "en" : "sq";

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <ShoppingBag className="h-6 w-6 text-primary" />
          <span className="font-display text-xl font-bold text-gradient-gold hidden sm:inline">{t("common.appName")}</span>
        </Link>

        <nav className="flex items-center gap-0.5 sm:gap-1.5 shrink-0">
          {/* Language / Region Switcher */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Globe className="h-5 w-5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 space-y-3" align="end">
              {/* Language */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("header.language")}</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => i18n.changeLanguage("sq")}
                    className={`flex-1 text-xs py-1.5 rounded-md border transition-all ${currentLang === "sq" ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
                  >
                    🇦🇱 Shqip
                  </button>
                  <button
                    onClick={() => i18n.changeLanguage("en")}
                    className={`flex-1 text-xs py-1.5 rounded-md border transition-all ${currentLang === "en" ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
                  >
                    🇬🇧 English
                  </button>
                </div>
              </div>

              {/* Region */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("header.region")}</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {REGIONS.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => setRegion(r.value)}
                      className={`text-xs py-1.5 px-2 rounded-md border transition-all ${region === r.value ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
                    >
                      {t(r.labelKey)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Currency */}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">{t("sell.currency")}</p>
                <div className="flex gap-1.5">
                  {SUPPORTED_CURRENCIES.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => setCurrency(c.code)}
                      className={`flex-1 text-xs py-1.5 rounded-md border transition-all ${currency === c.code ? "border-primary bg-primary/10 text-primary font-semibold" : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
                    >
                      {c.symbol} {c.code}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {user ? (
            <>
              <NotificationsDropdown />
              <Button variant="ghost" size="icon" asChild className="relative h-9 w-9">
                <Link to="/messages">
                  <MessageCircle className="h-5 w-5" />
                  {messageUnreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                      {messageUnreadCount > 9 ? "9+" : messageUnreadCount}
                    </span>
                  )}
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex h-9 w-9">
                <Link to="/orders">
                  <Package className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild className="hidden sm:inline-flex h-9 w-9">
                <Link to="/analytics">
                  <BarChart3 className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" asChild>
                <Link to="/profile">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
              {isAdmin && (
                <Button variant="ghost" size="icon" asChild>
                  <Link to="/admin">
                    <ShieldCheck className="h-5 w-5" />
                  </Link>
                </Button>
              )}
              <Button variant="ghost" size="icon" onClick={signOut}>
                <LogOut className="h-5 w-5" />
              </Button>
              <Button variant="gold" size="icon" className="rounded-full w-9 h-9 shadow-md" asChild>
                <Link to="/sell">
                  <Plus className="h-5 w-5" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="gold-outline" size="sm" asChild>
                <Link to="/login">{t("common.login")}</Link>
              </Button>
              <Button variant="gold" size="icon" className="rounded-full w-9 h-9 shadow-md" asChild>
                <Link to="/sell">
                  <Plus className="h-5 w-5" />
                </Link>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
