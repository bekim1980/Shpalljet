-- Prevent duplicate conversations per (product, buyer, seller)
CREATE UNIQUE INDEX IF NOT EXISTS conversations_product_buyer_seller_uniq
  ON public.conversations (product_id, buyer_id, seller_id);