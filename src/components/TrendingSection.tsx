import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Vertical } from "@/contexts/VerticalContext";
import { formatPrice, type CurrencyCode } from "@/lib/currency";
import ThumbImage from "@/components/common/ThumbImage";

const verticalLabels: Record<string, string> = {
  luxe: "LUXE",
  market: "MARKET",
  rent: "RENT",
  services: "SERVICES",
};

const TrendingSection = () => {
  const { data: trending, isLoading } = useQuery({
    queryKey: ["trending-preview"],
    queryFn: async () => {
      const verticals: Vertical[] = ["luxe", "market", "rent", "services"];
      const results: Record<string, any[]> = {};

      await Promise.all(
        verticals.map(async (v) => {
          const { data } = await supabase
            .from("products")
            .select("id, title, price, image_urls, vertical, currency")
            .eq("status", "active")
            .eq("vertical", v)
            .order("created_at", { ascending: false })
            .limit(3);
          results[v] = data ?? [];
        })
      );

      return results;
    },
  });

  const hasAny = trending && Object.values(trending).some((arr) => arr.length > 0);

  if (isLoading || !hasAny) return null;

  return (
    <section className="py-12 md:py-16">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="flex items-center gap-2 mb-8"
        >
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl md:text-2xl font-bold">
            Trending
          </h2>
        </motion.div>

        <div className="space-y-8">
          {(["luxe", "market", "rent", "services"] as Vertical[]).map(
            (v) =>
              trending?.[v]?.length > 0 && (
                <motion.div
                  key={v}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.7 }}
                >
                  <h3 className="text-xs tracking-[0.2em] uppercase text-muted-foreground font-semibold mb-3">
                    {verticalLabels[v]}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {trending[v].map((item: any) => (
                      <Link
                        key={item.id}
                        to={`/product/${item.id}`}
                        className="group block"
                      >
                        <div className="aspect-square rounded-xl overflow-hidden bg-muted border border-border/50 relative group-hover:scale-[1.02] transition-transform duration-300">
                          <ThumbImage
                            src={item.image_urls?.[0] ?? null}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <p className="text-xs font-medium mt-1.5 truncate text-foreground">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrice(Number(item.price), (item.currency || "EUR") as CurrencyCode)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )
          )}
        </div>
      </div>
    </section>
  );
};

export default TrendingSection;
