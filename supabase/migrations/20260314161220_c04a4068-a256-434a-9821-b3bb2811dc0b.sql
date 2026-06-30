
-- 1. Create enums
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled', 'refunded');
CREATE TYPE public.payment_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded');
CREATE TYPE public.payout_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- 2. Create orders table
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  status public.order_status NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Create order_items table
CREATE TABLE public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1
);

-- 4. Create payments table
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'stripe',
  provider_payment_intent_id text,
  status public.payment_status NOT NULL DEFAULT 'pending',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'EUR',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Create payouts table
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  status public.payout_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Indexes
CREATE INDEX idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX idx_orders_seller_id ON public.orders(seller_id);
CREATE INDEX idx_orders_status ON public.orders(status);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payouts_seller_id ON public.payouts(seller_id);
CREATE INDEX idx_order_items_order_id ON public.order_items(order_id);

-- 7. Updated_at trigger on orders
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8. RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Orders: buyers and sellers see their own
CREATE POLICY "Buyers can view own orders" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = buyer_id);
CREATE POLICY "Sellers can view orders for their products" ON public.orders
  FOR SELECT TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Order items: visible to order participants
CREATE POLICY "Order participants can view items" ON public.order_items
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (auth.uid() = o.buyer_id OR auth.uid() = o.seller_id))
  );
CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Payments: private, admin-only read
CREATE POLICY "Admins can view all payments" ON public.payments
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Order participants can view payment status" ON public.payments
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (auth.uid() = o.buyer_id OR auth.uid() = o.seller_id))
  );

-- Payouts: seller sees own, admin sees all
CREATE POLICY "Sellers can view own payouts" ON public.payouts
  FOR SELECT TO authenticated USING (auth.uid() = seller_id);
CREATE POLICY "Admins can view all payouts" ON public.payouts
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
