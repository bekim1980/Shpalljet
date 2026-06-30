import { Link, useLocation } from "react-router-dom";
import { Compass, Plus, ListChecks, MessageCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

const itemBase =
  "flex flex-col items-center justify-center gap-1 flex-1 py-2 text-[11px] font-medium transition-colors";

export default function XhiroBottomNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const isFeed = pathname === "/rides";
  const isPost = pathname === "/rides/new";
  const isMine = pathname === "/my-rides";
  const isMsg = pathname.startsWith("/messages");

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <div className="max-w-md mx-auto flex items-stretch">
        <Link to="/rides" className={`${itemBase} ${isFeed ? "text-primary" : "text-muted-foreground"}`}>
          <Compass className="h-5 w-5" />
          {t("xhiro.nav.feed", "Feed")}
        </Link>
        <Link to="/rides/new" className={`${itemBase} ${isPost ? "text-primary" : "text-muted-foreground"}`}>
          <div className="h-9 w-9 -mt-3 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <Plus className="h-5 w-5" />
          </div>
          {t("xhiro.nav.post", "Post")}
        </Link>
        <Link to="/my-rides" className={`${itemBase} ${isMine ? "text-primary" : "text-muted-foreground"}`}>
          <ListChecks className="h-5 w-5" />
          {t("xhiro.nav.mine", "My rides")}
        </Link>
        <Link to="/messages" className={`${itemBase} ${isMsg ? "text-primary" : "text-muted-foreground"}`}>
          <MessageCircle className="h-5 w-5" />
          {t("xhiro.nav.messages", "Inbox")}
        </Link>
      </div>
    </nav>
  );
}
