import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { SessionProvider } from "@/providers/SessionProvider";
import { VerticalProvider } from "@/contexts/VerticalContext";
import { LocaleProvider } from "@/contexts/LocaleContext";
import VerticalThemeWrapper from "@/components/VerticalThemeWrapper";
import InstallBanner from "@/components/install/InstallBanner";
import Homepage from "./pages/Homepage.tsx";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import Messages from "./pages/Messages.tsx";
import Sell from "./pages/Sell.tsx";
import Profile from "./pages/Profile.tsx";
import SearchResults from "./pages/SearchResults.tsx";
import NotFound from "./pages/NotFound.tsx";
import Admin from "./pages/Admin.tsx";
import Orders from "./pages/Orders.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import GoogleAuthCallback from "./pages/GoogleAuthCallback.tsx";
import Install from "./pages/Install.tsx";
import Analytics from "./pages/Analytics.tsx";
import Insights from "./pages/Insights.tsx";
import Pricing from "./pages/Pricing.tsx";
import Rides from "./pages/Rides.tsx";
import RideNew from "./pages/RideNew.tsx";
import RideDetail from "./pages/RideDetail.tsx";
import MyRides from "./pages/MyRides.tsx";
import AIChatWidget from "@/components/ai/AIChatWidget";
import { ProtectedRoute, AdminRoute } from "@/components/ProtectedRoute";
import { ENABLE_AI_ASSISTANT } from "@/config/features";

const queryClient = new QueryClient();

const AIChatWidgetGate = () => {
  const { pathname } = useLocation();
  if (!ENABLE_AI_ASSISTANT) return null;
  const hide =
    pathname.startsWith("/rides") ||
    pathname === "/my-rides" ||
    pathname === "/" ||
    pathname === "/index" ||
    pathname === "/login";
  if (hide) return null;
  return <AIChatWidget />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SessionProvider>
      <AuthProvider>
        <LocaleProvider>
          <VerticalProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <VerticalThemeWrapper>
                <InstallBanner />
                <Routes>
                  <Route path="/" element={<Homepage />} />
                  <Route path="/index" element={<Homepage />} />
                  <Route path="/browse" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/auth/google-callback" element={<GoogleAuthCallback />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/p/:slug" element={<ProductDetail />} />
                  <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
                  <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/search" element={<SearchResults />} />
                  <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
                  <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
                  <Route path="/install" element={<Install />} />
                  <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                  <Route path="/insights" element={<AdminRoute><Insights /></AdminRoute>} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/rides" element={<Rides />} />
                  <Route path="/rides/new" element={<ProtectedRoute><RideNew /></ProtectedRoute>} />
                  <Route path="/rides/:id" element={<RideDetail />} />
                  <Route path="/my-rides" element={<MyRides />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
                <AIChatWidgetGate />
              </VerticalThemeWrapper>
            </BrowserRouter>
          </VerticalProvider>
        </LocaleProvider>
      </AuthProvider>
      </SessionProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
