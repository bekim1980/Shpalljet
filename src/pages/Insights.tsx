import { useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Eye, MessageCircle, Heart, Rocket, MousePointerClick, TrendingUp, AlertTriangle, Flame, DollarSign, Bookmark } from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { getRecordedEvents, track } from "@/lib/analytics";
import BoostDialog from "@/components/product/BoostDialog";
import { PAYMENTS_ENABLED } from "@/config/features";

interface ProductRow {
  id: string;
  title: string;
  category: string;
  views_count: number;
  messages_count: number;
  favorites_count: number;
  is_boosted: boolean;
  boost_expires_at: string | null;
}

const useInsightProducts = (enabled: boolean) =>
  useQuery({
    queryKey: ["insight-products"],
    enabled,
    queryFn: async (): Promise<ProductRow[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, category, views_count, messages_count, favorites_count, is_boosted, boost_expires_at")
        .eq("status", "active");
      if (error) throw error;
      return (data ?? []) as ProductRow[];
    },
    staleTime: 60_000,
  });

const top = <T,>(arr: T[], key: (t: T) => number, n = 10) =>
  [...arr].sort((a, b) => key(b) - key(a)).slice(0, n);

const conv = (p: ProductRow) => (p.views_count > 0 ? p.messages_count / p.views_count : 0);

const ProductLink = ({ id, title }: { id: string; title: string }) => (
  <Link to={`/product/${id}`} className="text-primary hover:underline truncate inline-block max-w-[180px] align-middle">
    {title}
  </Link>
);

const ListTable = ({
  rows,
  metricLabel,
  metricValue,
}: {
  rows: ProductRow[];
  metricLabel: string;
  metricValue: (p: ProductRow) => string;
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Listim</TableHead>
        <TableHead className="text-right">{metricLabel}</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.length === 0 && (
        <TableRow>
          <TableCell colSpan={2} className="text-center text-muted-foreground text-sm">
            Pa të dhëna
          </TableCell>
        </TableRow>
      )}
      {rows.map((p) => (
        <TableRow key={p.id}>
          <TableCell>
            <ProductLink id={p.id} title={p.title} />
            {p.is_boosted && p.boost_expires_at && new Date(p.boost_expires_at) > new Date() && (
              <Badge variant="secondary" className="ml-2 text-[10px]">Promoted</Badge>
            )}
          </TableCell>
          <TableCell className="text-right font-medium">{metricValue(p)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

const Insights = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading: adminLoading } = useIsAdmin();
  const { data: products = [], isLoading } = useInsightProducts(!!isAdmin);

  const events = useMemo(() => getRecordedEvents(), []);

  const eventCounts = useMemo(() => {
    const c: Record<string, number> = {
      card_click: 0,
      message_sent_success: 0,
      boost_click: 0,
      boost_confirm: 0,
      favorite_toggle: 0,
    };
    for (const e of events) if (e.event in c) c[e.event]++;
    return c;
  }, [events]);

  const categoryClicks = useMemo(() => {
    const map = new Map<string, number>();
    const byId = new Map(products.map((p) => [p.id, p.category]));
    for (const e of events) {
      if (e.event !== "card_click") continue;
      const id = (e.props as { product_id?: string }).product_id;
      const cat = (id && byId.get(id)) || (e.props as { category?: string }).category;
      if (!cat) continue;
      map.set(cat, (map.get(cat) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [events, products]);

  const boosted = useMemo(
    () =>
      products.filter(
        (p) => p.is_boosted && p.boost_expires_at && new Date(p.boost_expires_at) > new Date(),
      ),
    [products],
  );

  const totalsCards = [
    { label: "Card clicks", value: eventCounts.card_click, icon: MousePointerClick },
    { label: "Messages sent", value: eventCounts.message_sent_success, icon: MessageCircle },
    { label: "Favorites", value: eventCounts.favorite_toggle, icon: Heart },
    { label: "Boost opens", value: eventCounts.boost_click, icon: Rocket },
    { label: "Boost confirms", value: eventCounts.boost_confirm, icon: TrendingUp },
  ];

  type InsightType = "low_conversion" | "high_performer" | "boost_underperform" | "favorites_no_contact";

  interface Recommendation {
    type: InsightType;
    product: ProductRow;
    message: string;
    icon: typeof AlertTriangle;
  }

  const recommendations = useMemo<Recommendation[]>(() => {
    const out: Recommendation[] = [];

    for (const p of products) {
      const rate = conv(p);

      // 1) Low conversion warning: views > 50, messages == 0
      if (p.views_count > 50 && p.messages_count === 0) {
        out.push({
          type: "low_conversion",
          product: p,
          message: "Listing gets views but no messages. Improve title, price, or photos.",
          icon: AlertTriangle,
        });
        continue; // avoid duplicate insight for same listing
      }

      // 2) High performer: conversion > 0.2
      if (rate > 0.2) {
        out.push({
          type: "high_performer",
          product: p,
          message: PAYMENTS_ENABLED
            ? "High converting listing — consider boosting it."
            : "High converting listing — keep photos and details up to date.",
          icon: Flame,
        });
        continue;
      }

      // 3) Underperforming boosted: boosted active, conversion < 0.05 (and views >= 20 for significance)
      const isBoostActive = p.is_boosted && p.boost_expires_at && new Date(p.boost_expires_at) > new Date();
      if (isBoostActive && rate < 0.05 && p.views_count >= 20) {
        out.push({
          type: "boost_underperform",
          product: p,
          message: "Boost is not effective. Consider updating content.",
          icon: DollarSign,
        });
        continue;
      }

      // 4) High favorites but low messages: favorites >= 3 and messages == 0
      if (p.favorites_count >= 3 && p.messages_count === 0) {
        out.push({
          type: "favorites_no_contact",
          product: p,
          message: "Users are interested but not contacting. Price may be too high.",
          icon: Bookmark,
        });
        continue;
      }
    }

    return out.slice(0, 5);
  }, [products]);

  if (loading || adminLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center space-y-4">
          <p className="text-muted-foreground">Kërkohet hyrja.</p>
          <Button variant="default" onClick={() => navigate("/login")}>Hyr</Button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center text-muted-foreground">Vetëm administratorët.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-6 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Insights</h1>
          <p className="text-sm text-muted-foreground">
            Çfarë po marrin vëmendje, çfarë po krijon mesazhe, dhe a po funksionojnë boost-et.
          </p>
        </div>

        {/* Action totals (session) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {totalsCards.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <c.icon className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="text-xl font-bold">{c.value}</p>
                  <p className="text-[11px] text-muted-foreground">{c.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground -mt-3">
          Veprimet maten brenda sesionit aktual. Counters e listimeve janë gjithëkohësh.
        </p>

        {/* Insights & Recommendations */}
        {!isLoading && recommendations.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Insights & Recommendations
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendations.map((rec) => {
                const Icon = rec.icon;
                const ACTION: Record<InsightType, { label: string; kind: "improve" | "boost" | "edit" | "price" }> = {
                  low_conversion: { label: "Improve listing", kind: "improve" },
                  high_performer: PAYMENTS_ENABLED
                    ? { label: "Boost now", kind: "boost" }
                    : { label: "Edit listing", kind: "edit" },
                  boost_underperform: { label: "Edit listing", kind: "edit" },
                  favorites_no_contact: { label: "Adjust price", kind: "price" },
                };
                const action = ACTION[rec.type];

                const fireClick = () => {
                  track("insight_click", { props: { type: rec.type, product_id: rec.product.id } });
                };
                const fireAction = () => {
                  track("insight_action_click", {
                    props: { type: action.kind, insight_type: rec.type, product_id: rec.product.id },
                  });
                };
                const focusByKind: Record<typeof action.kind, string | null> = {
                  improve: "title",
                  edit: "title",
                  price: "price",
                  boost: null,
                };
                const goEdit = () => {
                  fireAction();
                  const focus = focusByKind[action.kind];
                  const qs = new URLSearchParams({ tab: "listings", edit: rec.product.id });
                  if (focus) qs.set("focus", focus);
                  navigate(`/profile?${qs.toString()}`);
                };

                return (
                  <Card
                    key={`${rec.type}-${rec.product.id}`}
                    className="border-l-4 border-l-primary"
                    onClick={fireClick}
                  >
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="rounded-md bg-muted p-1.5 shrink-0">
                          <Icon className="h-4 w-4 text-primary" />
                        </div>
                        <p className="text-sm leading-snug text-foreground">{rec.message}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <ProductLink id={rec.product.id} title={rec.product.title} />
                        <Badge variant="secondary" className="text-[10px]">
                          {rec.product.views_count} views
                        </Badge>
                      </div>
                      <div className="pt-1">
                        {action.kind === "boost" ? (
                          <BoostDialog
                            productId={rec.product.id}
                            productTitle={rec.product.title}
                            currentBoostExpiresAt={rec.product.boost_expires_at}
                            trigger={
                              <Button size="sm" variant="gold" className="w-full" onClick={fireAction}>
                                {action.label}
                              </Button>
                            }
                          />
                        ) : (
                          <Button size="sm" variant="outline" className="w-full" onClick={goEdit}>
                            {action.label}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Eye className="h-4 w-4" /> Top viewed</CardTitle></CardHeader>
              <CardContent>
                <ListTable
                  rows={top(products, (p) => p.views_count)}
                  metricLabel="Views"
                  metricValue={(p) => String(p.views_count)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Top messaged</CardTitle></CardHeader>
              <CardContent>
                <ListTable
                  rows={top(products, (p) => p.messages_count)}
                  metricLabel="Messages"
                  metricValue={(p) => String(p.messages_count)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" /> Highest conversion</CardTitle></CardHeader>
              <CardContent>
                <ListTable
                  rows={top(products.filter((p) => p.views_count >= 5), conv)}
                  metricLabel="Msg / View"
                  metricValue={(p) => `${(conv(p) * 100).toFixed(1)}%`}
                />
                <p className="text-[11px] text-muted-foreground mt-2">Filtrohet me ≥ 5 views.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Rocket className="h-4 w-4" /> Boosted performance</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Listim</TableHead>
                      <TableHead className="text-right">V</TableHead>
                      <TableHead className="text-right">M</TableHead>
                      <TableHead className="text-right">Conv</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {boosted.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm">Asnjë boost aktiv</TableCell></TableRow>
                    )}
                    {boosted.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell><ProductLink id={p.id} title={p.title} /></TableCell>
                        <TableCell className="text-right">{p.views_count}</TableCell>
                        <TableCell className="text-right">{p.messages_count}</TableCell>
                        <TableCell className="text-right font-medium">{(conv(p) * 100).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><MousePointerClick className="h-4 w-4" /> Most clicked categories</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kategori</TableHead>
                      <TableHead className="text-right">Klikime</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categoryClicks.length === 0 && (
                      <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground text-sm">Pa klikime në sesion</TableCell></TableRow>
                    )}
                    {categoryClicks.map(([cat, n]) => (
                      <TableRow key={cat}>
                        <TableCell className="capitalize">{cat}</TableCell>
                        <TableCell className="text-right font-medium">{n}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Insights;
