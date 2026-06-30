import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import {
  useIsAdmin,
  useAdminProducts,
  useAdminProfiles,
  useAdminReports,
  useAdminPendingListings,
  useDeleteProduct,
  useModerateProduct,
  useBanUser,
  useUpdateReportStatus,
  useAuditLogs,
} from "@/hooks/useAdmin";
import StatsCards from "@/components/admin/StatsCards";
import ListingDetailDialog from "@/components/admin/ListingDetailDialog";
import UserDetailDialog from "@/components/admin/UserDetailDialog";
import { Loader2, ShieldCheck, Trash2, CheckCircle, XCircle, Ban, Clock, Eye, ScrollText } from "lucide-react";
import { format } from "date-fns";

const AUDIT_ACTIONS = [
  { value: "", label: "Të gjitha" },
  { value: "approve_listing", label: "Aprovo listim" },
  { value: "reject_listing", label: "Refuzo listim" },
  { value: "delete_listing", label: "Fshi listim" },
  { value: "suspend_user", label: "Pezullo përdorues" },
  { value: "restore_user", label: "Rivendos përdorues" },
];

const AUDIT_TARGET_TYPES = [
  { value: "", label: "Të gjitha" },
  { value: "product", label: "Produkt" },
  { value: "user", label: "Përdorues" },
];

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: roleLoading } = useIsAdmin();
  const { data: products } = useAdminProducts();
  const { data: profiles } = useAdminProfiles();
  const { data: reports } = useAdminReports();
  const { data: pending } = useAdminPendingListings();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate("/login");
    if (!authLoading && !roleLoading && user && isAdmin === false) navigate("/");
  }, [authLoading, roleLoading, user, isAdmin, navigate]);

  if (authLoading || roleLoading || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-6 space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-7 w-7 text-primary" />
          <h1 className="font-display text-2xl font-bold">Admin Dashboard</h1>
        </div>

        <StatsCards
          totalListings={products?.length ?? 0}
          totalUsers={profiles?.length ?? 0}
          totalReports={reports?.length ?? 0}
          pendingModeration={pending?.length ?? 0}
        />

        <Tabs defaultValue="listings" className="space-y-4">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide">
            <TabsTrigger value="listings" className="flex-shrink-0">Listimet</TabsTrigger>
            <TabsTrigger value="users" className="flex-shrink-0">Përdoruesit</TabsTrigger>
            <TabsTrigger value="reports" className="flex-shrink-0">Raportet</TabsTrigger>
            <TabsTrigger value="moderation" className="flex-shrink-0">Moderimi</TabsTrigger>
            <TabsTrigger value="audit" className="flex-shrink-0">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="listings"><ListingsTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="reports"><ReportsTab /></TabsContent>
          <TabsContent value="moderation"><ModerationTab /></TabsContent>
          <TabsContent value="audit"><AuditTab /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

/* ───── Audit Logs ───── */
const AuditTab = () => {
  const [actionFilter, setActionFilter] = useState("");
  const [targetFilter, setTargetFilter] = useState("");
  const { data: logs, isLoading } = useAuditLogs({
    action: actionFilter || undefined,
    targetType: targetFilter || undefined,
  });

  if (isLoading) return <Loading />;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ScrollText className="h-5 w-5" />
            Audit Log ({logs?.length ?? 0})
          </CardTitle>
          <div className="flex gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[160px] h-8 text-xs bg-secondary/50">
                <SelectValue placeholder="Veprimi" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_ACTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={targetFilter} onValueChange={setTargetFilter}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary/50">
                <SelectValue placeholder="Tipi" />
              </SelectTrigger>
              <SelectContent>
                {AUDIT_TARGET_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Veprimi</TableHead>
              <TableHead>Tipi</TableHead>
              <TableHead>Target ID</TableHead>
              <TableHead>Admin</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs?.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell>
                  <Badge variant="outline" className="text-xs">{log.action}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{log.target_type}</TableCell>
                <TableCell className="text-muted-foreground text-xs font-mono max-w-[120px] truncate">
                  {log.target_id ?? "—"}
                </TableCell>
                <TableCell className="text-sm">{log.admin_name ?? "Admin"}</TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {format(new Date(log.created_at), "dd/MM/yyyy HH:mm")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(!logs || logs.length === 0) && (
          <p className="text-center text-muted-foreground py-8">Nuk ka veprime të regjistruara.</p>
        )}
      </CardContent>
    </Card>
  );
};

/* ───── Listings ───── */
const ListingsTab = () => {
  const { data: products, isLoading } = useAdminProducts();
  const deleteMut = useDeleteProduct();
  const [selected, setSelected] = useState<any>(null);

  if (isLoading) return <Loading />;

  return (
    <>
      <ListingDetailDialog product={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Të gjitha listimet ({products?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulli</TableHead>
                <TableHead>Vertikali</TableHead>
                <TableHead>Çmimi</TableHead>
                <TableHead>Statusi</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Veprime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products?.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p)}>
                  <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="uppercase text-xs">{p.vertical}</Badge>
                  </TableCell>
                  <TableCell>€{Number(p.price).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {format(new Date(p.created_at), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); deleteMut.mutate(p.id); }}
                      disabled={deleteMut.isPending}
                    >
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Fshi
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(!products || products.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Nuk ka listime.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
};

/* ───── Users ───── */
const UsersTab = () => {
  const { data: profiles, isLoading } = useAdminProfiles();
  const banMut = useBanUser();
  const [selected, setSelected] = useState<any>(null);

  if (isLoading) return <Loading />;

  return (
    <>
      <UserDetailDialog profile={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Përdoruesit ({profiles?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Emri</TableHead>
                <TableHead>Statusi</TableHead>
                <TableHead>Regjistruar</TableHead>
                <TableHead className="text-right">Veprime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles?.map((p) => {
                const isBanned = !!p.banned_at;
                const isSuspended = p.suspended_until && new Date(p.suspended_until) > new Date();
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p)}>
                    <TableCell className="font-medium">{p.display_name || "Pa emër"}</TableCell>
                    <TableCell>
                      {isBanned ? (
                        <Badge variant="destructive">I bllokuar</Badge>
                      ) : isSuspended ? (
                        <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pezulluar</Badge>
                      ) : (
                        <Badge variant="secondary">Aktiv</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {format(new Date(p.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <span onClick={(e) => e.stopPropagation()}>
                        {!isBanned ? (
                          <>
                            <Button variant="outline" size="sm" onClick={() => banMut.mutate({ userId: p.user_id, action: "suspend" })} disabled={banMut.isPending}>
                              <Clock className="h-3.5 w-3.5 mr-1" /> 7 ditë
                            </Button>
                            <Button variant="destructive" size="sm" className="ml-1" onClick={() => banMut.mutate({ userId: p.user_id, action: "ban" })} disabled={banMut.isPending}>
                              <Ban className="h-3.5 w-3.5 mr-1" /> Bllo
                            </Button>
                          </>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => banMut.mutate({ userId: p.user_id, action: "unban" })} disabled={banMut.isPending}>
                            <CheckCircle className="h-3.5 w-3.5 mr-1" /> Zhbllo
                          </Button>
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {(!profiles || profiles.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Nuk ka përdorues.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
};

/* ───── Reports ───── */
const ReportsTab = () => {
  const { data: reports, isLoading } = useAdminReports();
  const updateMut = useUpdateReportStatus();

  if (isLoading) return <Loading />;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Raportet ({reports?.length ?? 0})</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipi</TableHead>
              <TableHead>Arsyeja</TableHead>
              <TableHead>Përshkrimi</TableHead>
              <TableHead>Statusi</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Veprime</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports?.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Badge variant="outline">{r.reported_type}</Badge></TableCell>
                <TableCell className="font-medium">{r.reason}</TableCell>
                <TableCell className="max-w-[200px] truncate text-muted-foreground">{r.description}</TableCell>
                <TableCell><Badge variant={r.status === "pending" ? "default" : "secondary"}>{r.status}</Badge></TableCell>
                <TableCell className="text-muted-foreground text-xs">{format(new Date(r.created_at), "dd/MM/yyyy")}</TableCell>
                <TableCell className="text-right space-x-1">
                  {r.status === "pending" && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => updateMut.mutate({ id: r.id, status: "reviewed" })} disabled={updateMut.isPending}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> Shqyrto
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => updateMut.mutate({ id: r.id, status: "resolved" })} disabled={updateMut.isPending}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Zgjidh
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {(!reports || reports.length === 0) && (
          <p className="text-center text-muted-foreground py-8">Nuk ka raporte.</p>
        )}
      </CardContent>
    </Card>
  );
};

/* ───── Moderation ───── */
const ModerationTab = () => {
  const { data: pending, isLoading } = useAdminPendingListings();
  const moderateMut = useModerateProduct();
  const [selected, setSelected] = useState<any>(null);

  if (isLoading) return <Loading />;

  return (
    <>
      <ListingDetailDialog product={selected} open={!!selected} onOpenChange={(o) => !o && setSelected(null)} />
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Listime në pritje ({pending?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titulli</TableHead>
                <TableHead>Vertikali</TableHead>
                <TableHead>Çmimi</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Veprime</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending?.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => setSelected(p)}>
                  <TableCell className="font-medium max-w-[200px] truncate">{p.title}</TableCell>
                  <TableCell><Badge variant="outline" className="uppercase text-xs">{p.vertical}</Badge></TableCell>
                  <TableCell>€{Number(p.price).toFixed(2)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">{format(new Date(p.created_at), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <span onClick={(e) => e.stopPropagation()}>
                      <Button variant="default" size="sm" onClick={() => moderateMut.mutate({ id: p.id, status: "approved" })} disabled={moderateMut.isPending}>
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Aprovo
                      </Button>
                      <Button variant="destructive" size="sm" className="ml-1" onClick={() => moderateMut.mutate({ id: p.id, status: "rejected" })} disabled={moderateMut.isPending}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Refuzo
                      </Button>
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {(!pending || pending.length === 0) && (
            <p className="text-center text-muted-foreground py-8">Nuk ka listime në pritje për moderim.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
};

const Loading = () => (
  <div className="flex justify-center py-12">
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
  </div>
);

export default Admin;
