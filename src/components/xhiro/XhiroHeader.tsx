import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Car } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Props {
  title?: string;
  showBack?: boolean;
  right?: React.ReactNode;
}

export default function XhiroHeader({ title, showBack, right }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md border-b border-border">
      <div className="max-w-md mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2 min-w-0">
          {showBack ? (
            <button
              onClick={() => navigate(-1)}
              className="h-9 w-9 -ml-2 inline-flex items-center justify-center rounded-full hover:bg-secondary"
              aria-label={t("common.back", "Back")}
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : (
            <Link to="/rides" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Car className="h-4.5 w-4.5" />
              </div>
              <span className="font-bold text-lg tracking-tight">Xhiro</span>
            </Link>
          )}
          {title && <h1 className="font-semibold text-base truncate ml-1">{title}</h1>}
        </div>
        <div className="flex items-center gap-1">{right}</div>
      </div>
    </header>
  );
}
