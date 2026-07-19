import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import PageTransition from "@/components/PageTransition";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Star, Rocket, RefreshCw, Eye } from "lucide-react";
import { PAYMENTS_ENABLED } from "@/config/features";

const Pricing = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PageTransition>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {t("pricing.title")}
            </h1>
            <p className="text-muted-foreground">
              {t("pricing.subtitle")}
            </p>
          </div>

          {/* Listing Plans */}
          <div className={`grid grid-cols-1 ${PAYMENTS_ENABLED ? "md:grid-cols-2" : "md:grid-cols-1 max-w-md mx-auto"} gap-6 mb-10`}>
            {/* Free Plan */}
            <Card className="border-2 border-border">
              <CardHeader className="text-center pb-2">
                <Badge variant="secondary" className="w-fit mx-auto mb-2">
                  {t("pricing.free")}
                </Badge>
                <CardTitle className="text-4xl font-bold text-foreground">
                  €0
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  {t("pricing.freeDuration")}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{t("pricing.freeFeature1")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{t("pricing.freeFeature2")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{t("pricing.freeFeature3")}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <Check className="h-4 w-4 text-green-500 shrink-0" />
                  <span>{t("pricing.freeFeature4")}</span>
                </div>
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => navigate("/sell")}
                >
                  {t("pricing.startFree")}
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plan */}
            {PAYMENTS_ENABLED && (
              <Card className="border-2 border-primary relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg font-medium">
                  {t("pricing.popular")}
                </div>
                <CardHeader className="text-center pb-2">
                  <Badge className="w-fit mx-auto mb-2 bg-primary text-primary-foreground">
                    <Star className="h-3 w-3 mr-1" />
                    {t("pricing.premium")}
                  </Badge>
                  <CardTitle className="text-4xl font-bold text-foreground">
                    €5
                  </CardTitle>
                  <p className="text-muted-foreground text-sm">
                    {t("pricing.premiumDuration")}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{t("pricing.premiumFeature1")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{t("pricing.premiumFeature2")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{t("pricing.premiumFeature3")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Check className="h-4 w-4 text-green-500 shrink-0" />
                    <span>{t("pricing.premiumFeature4")}</span>
                  </div>
                  <Button
                    className="w-full mt-4"
                    onClick={() => navigate("/sell")}
                  >
                    {t("pricing.getPremium")}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Boost Add-on */}
          {PAYMENTS_ENABLED && (
            <Card className="border-2 border-accent mb-10">
              <CardHeader className="text-center pb-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Rocket className="h-6 w-6 text-primary" />
                  <CardTitle className="text-2xl font-bold text-foreground">
                    {t("pricing.boostTitle")}
                  </CardTitle>
                </div>
                <div className="text-4xl font-bold text-foreground">€1.99</div>
                <p className="text-muted-foreground text-sm">
                  {t("pricing.boostDuration")}
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <Eye className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">{t("pricing.boostFeature1")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <Star className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">{t("pricing.boostFeature2")}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">{t("pricing.boostFeature3")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* FAQ — skip Premium/Boost FAQs while payments are off */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground text-center mb-4">
              {t("pricing.faqTitle")}
            </h2>
            <div className="space-y-3">
              {(PAYMENTS_ENABLED ? [1, 2, 3] : [1]).map((i) => (
                <div key={i} className="border border-border rounded-lg p-4">
                  <h3 className="font-medium text-foreground mb-1">
                    {t(`pricing.faq${i}Q`)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {t(`pricing.faq${i}A`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PageTransition>
    </div>
  );
};

export default Pricing;
