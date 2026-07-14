import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import SiteFooter from "@/components/SiteFooter";
import PageTransition from "@/components/PageTransition";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getSiteUrl } from "@/lib/siteUrl";
import { linkLegalEmails, tocLinkFocusClass } from "@/components/legal/linkLegalEmails";

type LegalSectionContent = {
  title: string;
  paragraphs?: string[];
  list?: string[];
};

type LegalDocumentLayoutProps = {
  documentKey: "terms" | "privacy";
  sectionIds: readonly string[];
  canonicalPath: "/terms" | "/privacy";
};

const LegalDocumentLayout = ({ documentKey, sectionIds, canonicalPath }: LegalDocumentLayoutProps) => {
  const { t } = useTranslation();
  const baseKey = `legal.${documentKey}`;
  const [activeId, setActiveId] = useState(sectionIds[0]);

  const sections = useMemo(
    () =>
      sectionIds.map((id) => {
        const content = t(`${baseKey}.sections.${id}`, { returnObjects: true }) as LegalSectionContent;
        return { id, ...content };
      }),
    [baseKey, sectionIds, t],
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-20% 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [sectionIds]);

  const canonical = `${getSiteUrl()}${canonicalPath}`;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={t(`${baseKey}.seoTitle`)}
        description={t(`${baseKey}.seoDescription`)}
        canonical={canonical}
      />
      <Header />
      <PageTransition>
        <div className="container mx-auto px-4 py-10 md:py-14 max-w-6xl flex-1">
          {/* Hero */}
          <header className="mb-10 md:mb-14 text-center max-w-3xl mx-auto">
            <p className="text-xs uppercase tracking-[0.25em] text-gold/80 font-medium mb-3">
              {t("legal.badge")}
            </p>
            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
              {t(`${baseKey}.title`)}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base leading-relaxed">
              {t(`${baseKey}.subtitle`)}
            </p>
            <p className="text-xs text-muted-foreground/80 mt-4">
              {t(`${baseKey}.lastUpdated`)}
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-8 lg:gap-12 items-start">
            {/* Sticky TOC — desktop */}
            <aside className="hidden lg:block">
              <nav
                className="sticky top-24 rounded-2xl border border-gold/15 bg-card/40 backdrop-blur-md p-5 shadow-[0_8px_40px_rgba(0,0,0,0.25)]"
                aria-label={t("legal.tocLabel")}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-gold/90 mb-4">
                  {t("legal.tocTitle")}
                </p>
                <ol className="space-y-1">
                  {sections.map(({ id, title }, index) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        aria-current={activeId === id ? "location" : undefined}
                        className={cn(
                          "block rounded-lg px-3 py-2 text-sm transition-colors",
                          tocLinkFocusClass,
                          activeId === id
                            ? "bg-gold/10 text-gold font-medium"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5",
                        )}
                      >
                        <span className="text-gold/50 mr-2 tabular-nums">{index + 1}.</span>
                        {title}
                      </a>
                    </li>
                  ))}
                </ol>
                <div className="mt-6 pt-4 border-t border-border/50 space-y-2 text-xs">
                  <Link to="/terms" className="block text-muted-foreground hover:text-gold transition-colors">
                    {t("auth.termsLink")}
                  </Link>
                  <Link to="/privacy" className="block text-muted-foreground hover:text-gold transition-colors">
                    {t("auth.privacyLink")}
                  </Link>
                </div>
              </nav>
            </aside>

            {/* Mobile TOC + sections */}
            <div className="min-w-0 space-y-6">
              <nav
                className="lg:hidden -mx-1 overflow-x-auto scrollbar-hide"
                aria-label={t("legal.tocLabel")}
              >
                <div className="flex gap-2 pb-2 min-w-max px-1">
                  {sections.map(({ id, title }) => (
                    <a
                      key={id}
                      href={`#${id}`}
                      aria-current={activeId === id ? "location" : undefined}
                      className={cn(
                        "shrink-0 inline-flex items-center min-h-11 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                        tocLinkFocusClass,
                        activeId === id
                          ? "border-gold/40 bg-gold/10 text-gold"
                          : "border-border/60 text-muted-foreground hover:border-gold/25",
                      )}
                    >
                      {title}
                    </a>
                  ))}
                </div>
              </nav>

              {sections.map(({ id, title, paragraphs = [], list = [] }) => (
                <section key={id} id={id} className="scroll-mt-28">
                  <Card className="border border-gold/10 bg-card/50 backdrop-blur-sm shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
                    <CardHeader className="pb-3">
                      <h2 className="font-display text-xl md:text-2xl font-semibold leading-none tracking-tight text-foreground">
                        {title}
                      </h2>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm md:text-[15px] text-muted-foreground leading-relaxed">
                      {paragraphs.map((paragraph, index) => (
                        <p key={index}>{linkLegalEmails(paragraph)}</p>
                      ))}
                      {list.length > 0 && (
                        <ul className="list-disc pl-5 space-y-2 marker:text-gold/70">
                          {list.map((item, index) => (
                            <li key={index}>{linkLegalEmails(item)}</li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>
                </section>
              ))}
            </div>
          </div>
        </div>
      </PageTransition>
      <SiteFooter />
    </div>
  );
};

export default LegalDocumentLayout;
