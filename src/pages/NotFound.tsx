import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 px-4">
          <SearchX className="h-16 w-16 mx-auto text-muted-foreground/30" />
          <h1 className="font-display text-5xl font-bold text-primary">404</h1>
          <p className="text-lg text-muted-foreground">Faqja që kërkoni nuk ekziston.</p>
          <Button variant="gold-outline" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Kthehu në Ballë
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
