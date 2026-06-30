import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/contexts/LocaleContext";
import { formatPrice } from "@/lib/currency";
import Header from "@/components/Header";
import EmptyState from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useOrders } from "@/hooks/useOrders";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, ShoppingBag, Package } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = { pending: "default", confirmed: "secondary", shipped: "secondary", delivered: "default", cancelled: "destructive", refunded: "destructive" };

const Orders = () => {
  const { user, loading } = useAuth();
  const { data: orders, isLoading } = useOrders();
  const { t } = useTranslation();
  const { currency } = useLocale();

  if (loading || isLoading) return (<div className="min-h-screen bg-background"><Header /><div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div></div>);

  const buyerOrders = orders?.filter((o: any) => o.is_buyer) ?? [];
  const sellerOrders = orders?.filter((o: any) => !o.is_buyer) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <ShoppingBag className="h-7 w-7 text-primary" />
          <h1 className="font-display text-2xl font-bold">{t("orders.title")}</h1>
        </motion.div>
        <Tabs defaultValue="purchases">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="purchases">{t("orders.purchases")} ({buyerOrders.length})</TabsTrigger>
            <TabsTrigger value="sales">{t("orders.sales")} ({sellerOrders.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="purchases"><OrderTable orders={buyerOrders} showSeller t={t} currency={currency} /></TabsContent>
          <TabsContent value="sales"><OrderTable orders={sellerOrders} showSeller={false} t={t} currency={currency} /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const OrderTable = ({ orders, showSeller, t, currency }: { orders: any[]; showSeller: boolean; t: any; currency: any }) => {
  if (orders.length === 0) return (<EmptyState icon={<Package className="h-10 w-10 text-muted-foreground/40" />} title={t("orders.noOrders")} description={t("orders.noOrdersDesc")} />);
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader><TableRow><TableHead>{t("orders.product")}</TableHead><TableHead>{showSeller ? t("orders.seller") : t("orders.buyer")}</TableHead><TableHead>{t("orders.amount")}</TableHead><TableHead>{t("orders.status")}</TableHead><TableHead>{t("orders.date")}</TableHead></TableRow></TableHeader>
          <TableBody>
            {orders.map((o: any) => (
              <TableRow key={o.id}>
                <TableCell className="font-medium max-w-[200px] truncate">{o.product?.title ?? t("orders.deletedProduct")}</TableCell>
                <TableCell className="text-muted-foreground">{showSeller ? o.seller_profile?.display_name ?? t("common.unknown") : o.buyer_profile?.display_name ?? t("common.unknown")}</TableCell>
                <TableCell>{formatPrice(Number(o.total_amount), (o.currency || currency))}</TableCell>
                <TableCell><Badge variant={(statusColors[o.status] as any) ?? "secondary"}>{o.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-xs">{format(new Date(o.created_at), "dd/MM/yyyy")}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default Orders;
