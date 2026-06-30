import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { CurrencyCode, Region } from "@/lib/currency";
import { getDefaultCurrency } from "@/lib/currency";

interface LocaleContextType {
  region: Region;
  setRegion: (r: Region) => void;
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
}

const LocaleContext = createContext<LocaleContextType>({
  region: "albania",
  setRegion: () => {},
  currency: "ALL",
  setCurrency: () => {},
});

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  const { i18n } = useTranslation();

  const [region, setRegionState] = useState<Region>(() => {
    return (localStorage.getItem("app_region") as Region) || "albania";
  });

  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    return (localStorage.getItem("app_currency") as CurrencyCode) || getDefaultCurrency(
      (localStorage.getItem("app_region") as Region) || "albania"
    );
  });

  const setRegion = (r: Region) => {
    setRegionState(r);
    localStorage.setItem("app_region", r);
    // Update currency to region default
    const defaultCurr = getDefaultCurrency(r);
    setCurrencyState(defaultCurr);
    localStorage.setItem("app_currency", defaultCurr);
  };

  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem("app_currency", c);
  };

  return (
    <LocaleContext.Provider value={{ region, setRegion, currency, setCurrency }}>
      {children}
    </LocaleContext.Provider>
  );
};

export const useLocale = () => useContext(LocaleContext);
