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
import { focusAuthFirstField } from "@/components/auth/focusAuthFirstField";
import { authOverlayClass } from "@/components/auth/authStyles";
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
          overlayClassName={authOverlayClass}
          className="border-t border-gold/15 bg-transparent p-0 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[94vh] overflow-y-auto rounded-t-[28px] [&>button.absolute]:hidden"
          onOpenAutoFocus={focusAuthFirstField}
          onCloseAutoFocus={(e) => handleCloseAutoFocus(e, onAfterClose)}
        >
          <SheetTitle className="sr-only">{t("login.signInToAccount")}</SheetTitle>
          <SheetDescription className="sr-only">{t("login.valueProp")}</SheetDescription>
          <div className="px-4 pt-2 pb-2">{content}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        overlayClassName={authOverlayClass}
        className="max-w-[520px] w-[calc(100%-2rem)] border-0 bg-transparent p-0 shadow-none gap-0 overflow-visible sm:rounded-[28px] [&>button.absolute]:hidden motion-reduce:animate-none"
        onOpenAutoFocus={focusAuthFirstField}
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
