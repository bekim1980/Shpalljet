import { useMemo } from "react";
import { motion } from "framer-motion";
import { BarChart3, Eye, MessageCircle, Package, TrendingUp, ShoppingBag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/contexts/LocaleContext";
import { formatPrice } from "@/lib/currency";
import { useAuth } from "@/hooks/useAuth";
import { useMyListings } from "@/hooks/useMyListings";
import { useOrders } from "@/hooks/useOrders";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSellerTotalViews } from "@/hooks/useProductViews";

const useSellerStats = (userId: string | undefined) => {
  const { data: orders } = useOrders();
  const { data: listings } = useMyListings();
  const { data: totalViews } = useSellerTotalViews(userId);
  const conversationCount = useQuery({ queryKey: ["seller-conversation-count", userId], enabled: !!userId, queryFn: async (): Promise<number> => { const { count, error } = await supabase.from("conversations").select("*", { count: "exact", head: true }).eq("seller_id", userId!); if (error) throw error; return count ?? 0; } });
  const reviewStats = useQuery({ queryKey: ["seller-review-stats", userId], enabled: !!userId, queryFn: async (): Promise<{ count: number; average: number }> => { const { data, error } = await supabase.from("reviews").select("rating").eq("seller_id", userId!); if (error) throw error; const count = data?.length ?? 0; const avg = count > 0 ? data!.reduce((s, r) => s + r.rating, 0) / count : 0; return { count, average: Math.round(avg * 10) / 10 }; } });
  return useMemo(() => {
    const sellerOrders = orders?.filter((o: any) => !o.is_buyer) ?? [];
    const totalRevenue = sellerOrders.reduce((s: number, o: any) => s + Number(o.total_amount), 0);
    return { activeListings: listings?.filter((l: any) => l.status === "active").length ?? 0, totalListings: listings?.length ?? 0, totalOrders: sellerOrders.length, pendingOrders: sellerOrders.filter((o: any) => o.status === "pending").length, totalRevenue, conversations: conversationCount.data ?? 0, reviewCount: reviewStats.data?.count ?? 0, avgRating: reviewStats.data?.average ?? 0, totalViews: totalViews ?? 0, isLoading: conversationCount.isLoading || reviewStats.isLoading };
  }, [orders, listings, totalViews, conversationCount.data, reviewStats.data, conversationCount.isLoading, reviewStats.isLoading]);
};

const Analytics = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currency } = useLocale();
  const stats = useSellerStats(user?.id);

  if (loading) return (<div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>);
  if (!user) return (<div className="min-h-screen bg-background"><Header /><div className="container py-20 text-center space-y-4"><p className="text-muted-foreground">{t("analytics.loginRequired")}</p><Button variant="gold" onClick={() => navigate("/login")}>{t("common.login")}</Button></div></div>);

  const statCards = [
    { label: t("analytics.activeListings"), value: stats.activeListings, icon: Package, color: "text-primary" },
    { label: t("analytics.totalViews"), value: stats.totalViews, icon: Eye, color: "text-sky-400" },
    { label: t("analytics.totalOrders"), value: stats.totalOrders, icon: ShoppingBag, color: "text-emerald-400" },
    { label: t("analytics.pending"), value: stats.pendingOrders, icon: TrendingUp, color: "text-amber-400" },
    { label: t("analytics.conversations"), value: stats.conversations, icon: MessageCircle, color: "text-blue-400" },
    { label: t("analytics.reviews"), value: stats.reviewCount, icon: Eye, color: "text-violet-400" },
    { label: t("analytics.revenue"), value: formatPrice(stats.totalRevenue, currency), icon: BarChart3, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-primary" />
          <div><h1 className="font-display text-2xl font-bold">{t("analytics.title")}</h1><p className="text-sm text-muted-foreground">{t("analytics.subtitle")}</p></div>
        </motion.div>
        {stats.avgRating > 0 && (<motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}><Card className="border-primary/20 bg-primary/5"><CardContent className="py-4 flex items-center justify-between"><span className="text-sm font-medium">{t("analytics.avgRating")}</span><span className="text-2xl font-bold text-primary">⭐ {stats.avgRating}</span></CardContent></Card></motion.div>)}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {statCards.map((s, i) => (<motion.div key={s.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}><Card className="h-full"><CardContent className="p-4 flex flex-col gap-2"><div className="flex items-center gap-2"><s.icon className={`h-4 w-4 ${s.color}`} /><span className="text-xs text-muted-foreground">{s.label}</span></div><p className="text-2xl font-bold">{s.value}</p></CardContent></Card></motion.div>))}
        </div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}><Card><CardHeader><CardTitle className="text-base">{t("analytics.tips")}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm text-muted-foreground"><p>{t("analytics.tip1")}</p><p>{t("analytics.tip2")}</p><p>{t("analytics.tip3")}</p></CardContent></Card></motion.div>
      </div>
    </div>
  );
};

export default Analytics;
