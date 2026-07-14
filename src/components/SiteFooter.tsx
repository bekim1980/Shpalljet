import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const SiteFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-border/50 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] mt-auto">
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <Link to="/" className="font-display text-gradient-gold font-bold text-sm hover:opacity-90 transition-opacity">
          {t("common.appName")}
        </Link>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2" aria-label={t("legal.footerNavLabel")}>
          <Link to="/terms" className="hover:text-foreground transition-colors">
            {t("auth.termsLink")}
          </Link>
          <Link to="/privacy" className="hover:text-foreground transition-colors">
            {t("auth.privacyLink")}
          </Link>
          <Link to="/install" className="hover:text-foreground transition-colors">
            {t("homepage.installApp")}
          </Link>
        </nav>
        <p className="text-center md:text-right">{t("common.copyright")}</p>
      </div>
    </footer>
  );
};

export default SiteFooter;
