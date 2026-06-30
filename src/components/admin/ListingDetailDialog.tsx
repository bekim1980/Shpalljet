import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface ListingDetailDialogProps {
  product: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ListingDetailDialog = ({ product, open, onOpenChange }: ListingDetailDialogProps) => {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{product.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {product.image_urls?.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {product.image_urls.slice(0, 4).map((url: string, i: number) => (
                <img key={i} src={url} alt="" className="rounded-md w-full h-32 object-cover" />
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Detail label="Çmimi" value={`€${Number(product.price).toFixed(2)}`} />
            <Detail label="Vertikali" value={<Badge variant="outline" className="uppercase text-xs">{product.vertical}</Badge>} />
            <Detail label="Kategoria" value={product.category} />
            <Detail label="Gjendja" value={product.condition} />
            <Detail label="Statusi" value={<Badge variant={product.status === "active" ? "default" : "secondary"}>{product.status}</Badge>} />
            <Detail label="Moderimi" value={<Badge variant="outline">{product.moderation_status}</Badge>} />
            {product.brand && <Detail label="Marka" value={product.brand} />}
            {product.location && <Detail label="Lokacioni" value={product.location} />}
            <Detail label="Krijuar" value={format(new Date(product.created_at), "dd/MM/yyyy HH:mm")} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Përshkrimi</p>
            <p className="text-sm">{product.description || "Pa përshkrim"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Seller ID</p>
            <p className="text-xs font-mono break-all">{product.seller_id}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Detail = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <div className="font-medium">{value}</div>
  </div>
);

export default ListingDetailDialog;
