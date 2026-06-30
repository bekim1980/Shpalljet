import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSellerReviews, useCreateReview } from "@/hooks/useReviews";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { sq } from "date-fns/locale";

interface ReviewSectionProps {
  sellerId: string;
  productId: string;
}

const ReviewSection = ({ sellerId, productId }: ReviewSectionProps) => {
  const { user } = useAuth();
  const { data: reviews, isLoading } = useSellerReviews(sellerId);
  const { mutate: createReview, isPending } = useCreateReview();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [showForm, setShowForm] = useState(false);

  const canReview = user && user.id !== sellerId;
  const alreadyReviewed = reviews?.some((r) => r.reviewer_id === user?.id && r.product_id === productId);

  const handleSubmit = () => {
    if (!rating) return;
    createReview(
      { sellerId, productId, rating, comment },
      { onSuccess: () => { setShowForm(false); setComment(""); setRating(5); } }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">Vlerësime</h3>
        {canReview && !alreadyReviewed && (
          <Button variant="gold-outline" size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Anulo" : "Shkruaj Vlerësim"}
          </Button>
        )}
      </div>

      {showForm && (
        <div className="glass-card rounded-lg p-4 space-y-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s} onClick={() => setRating(s)} className="transition-transform hover:scale-110">
                <Star className={`h-6 w-6 ${s <= rating ? "fill-primary text-primary" : "text-muted-foreground/30"}`} />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Shkruani mendimin tuaj..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={500}
          />
          <Button variant="gold" size="sm" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Duke dërguar..." : "Dërgo"}
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Duke ngarkuar...</p>
      ) : !reviews?.length ? (
        <p className="text-sm text-muted-foreground">Ende pa vlerësime</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="glass-card rounded-lg p-3 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                    {(review.reviewer?.display_name || "P").charAt(0)}
                  </div>
                  <span className="text-sm font-medium">{review.reviewer?.display_name || "Përdorues"}</span>
                </div>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-primary text-primary" : "text-muted-foreground/20"}`} />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              )}
              <p className="text-[10px] text-muted-foreground/60">
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true, locale: sq })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
