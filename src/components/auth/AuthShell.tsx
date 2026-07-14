import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import AuthShellContent from "@/components/auth/AuthShellContent";
import { useTranslation } from "react-i18next";
import type { AuthView } from "@/components/auth/types";

type AuthShellProps = {
  open: boolean;
  returnTo: string;
  initialView: AuthView;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onAfterClose?: () => void;
  contentRef?: React.RefObject<HTMLDivElement | null>;
};

const AUTH_OVERLAY_CLASS = "bg-black/70 backdrop-blur-sm";

const handleCloseAutoFocus = (e: Event, onAfterClose?: () => void) => {
  e.preventDefault();
  onAfterClose?.();
};

const AuthShell = ({
  open,
  returnTo,
  initialView,
  onOpenChange,
  onClose,
  onAfterClose,
}: AuthShellProps) => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const content = (
    <AuthShellContent
      variant="modal"
      returnTo={returnTo}
      initialView={initialView}
      idPrefix="auth-shell"
      onClose={onClose}
      autoFocus={open}
    />
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          overlayClassName={AUTH_OVERLAY_CLASS}
          className="border-t border-white/10 bg-black/90 backdrop-blur-xl p-0 pb-[env(safe-area-inset-bottom)] max-h-[92vh] overflow-y-auto rounded-t-2xl"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => handleCloseAutoFocus(e, onAfterClose)}
        >
          <SheetTitle className="sr-only">{t("login.signInToAccount")}</SheetTitle>
          <SheetDescription className="sr-only">{t("login.valueProp")}</SheetDescription>
          <div className="px-3 pt-3 pb-4">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={AUTH_OVERLAY_CLASS}
        className="max-w-md border-0 bg-transparent p-0 shadow-none gap-0 overflow-visible sm:rounded-2xl"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => handleCloseAutoFocus(e, onAfterClose)}
      >
        <DialogTitle className="sr-only">{t("login.signInToAccount")}</DialogTitle>
        <DialogDescription className="sr-only">{t("login.valueProp")}</DialogDescription>
        {content}
      </DialogContent>
    </Dialog>
  );
};

export default AuthShell;
