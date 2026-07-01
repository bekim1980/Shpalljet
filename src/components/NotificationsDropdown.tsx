import { Bell, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "react-i18next";
import { useNotifications, useMarkNotificationRead, useMarkAllRead } from "@/hooks/useNotifications";
import { stripNotificationInternalMarkers } from "@/lib/messageNotifications";
import { formatDistanceToNow } from "date-fns";
import { sq, enUS } from "date-fns/locale";

const NotificationsDropdown = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { data: notifications, unreadCount } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead } = useMarkAllRead();
  const dateLocale = i18n.language?.startsWith("en") ? enUS : sq;

  const handleClick = (notification: { id: string; read: boolean; link: string | null }) => {
    if (!notification.read) markRead(notification.id);
    if (notification.link) navigate(notification.link);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (<span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">{unreadCount > 9 ? "9+" : unreadCount}</span>)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border/50">
          <span className="font-display text-sm font-semibold">{t("notifications.title")}</span>
          {unreadCount > 0 && (<button onClick={() => markAllRead()} className="text-xs text-primary hover:underline flex items-center gap-1"><Check className="h-3 w-3" />{t("notifications.readAll")}</button>)}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {!notifications?.length ? (<div className="p-6 text-center text-sm text-muted-foreground">{t("notifications.noNotifications")}</div>) : (
            notifications.map((n) => {
              // Hide internal idempotency marker like "[pid:xxx|to:123]" from user-facing copy
              const cleanMessage = stripNotificationInternalMarkers(n.message ?? "");
              return (
                <button key={n.id} onClick={() => handleClick(n)} className={`w-full text-left p-3 border-b border-border/30 hover:bg-secondary/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-2">
                    {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      {cleanMessage && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{cleanMessage}</p>}
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: dateLocale })}</p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsDropdown;
