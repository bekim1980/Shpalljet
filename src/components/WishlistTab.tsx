import { Loader2, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { useWishlist } from "@/hooks/useWishlist";
import { useProducts, categoryLabels } from "@/hooks/useProducts";
import { useLocale } from "@/contexts/LocaleContext";
import { formatPrice, type CurrencyCode } from "@/lib/currency";

const WishlistTab = () => {
  const { data: wishlistSet, isLoading: wishLoading } = useWishlist();
  const { data: products, isLoading: productsLoading } = useProducts();
  const { currency } = useLocale();

  const isLoading = wishLoading || productsLoading;

  const wishedProducts = products?.filter((p) => wishlistSet?.has(p.id)) ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!wishedProducts.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        <Heart className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
        Lista e dëshirave është bosh
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {wishedProducts.map((product) => (
        <Link
          key={product.id}
          to={`/product/${product.id}`}
          className="glass-card rounded-lg p-3 flex gap-3 items-center hover:bg-secondary/50 transition-colors"
        >
          <div className="w-14 h-14 rounded-md bg-secondary/50 shrink-0 overflow-hidden">
            {product.image_urls?.[0] ? (
              <img src={product.image_urls[0]} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-[10px]">
                {categoryLabels[product.category] || product.category}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{product.title}</p>
            <p className="text-sm text-primary font-semibold">{formatPrice(Number(product.price), (product.currency || currency) as CurrencyCode)}</p>
            <p className="text-[10px] text-muted-foreground capitalize">{product.seller?.display_name || "I panjohur"}</p>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default WishlistTab;
