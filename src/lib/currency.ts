export type CurrencyCode = "ALL" | "EUR" | "MKD";

export type Region = "albania" | "kosovo" | "northMacedonia" | "diaspora";

export const SUPPORTED_CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: "ALL", symbol: "L", label: "Lek (ALL)" },
  { code: "EUR", symbol: "€", label: "Euro (EUR)" },
  { code: "MKD", symbol: "ден", label: "Denar (MKD)" },
];

export const REGIONS: { value: Region; labelKey: string; defaultCurrency: CurrencyCode; defaultLang: string }[] = [
  { value: "albania", labelKey: "regions.albania", defaultCurrency: "ALL", defaultLang: "sq" },
  { value: "kosovo", labelKey: "regions.kosovo", defaultCurrency: "EUR", defaultLang: "sq" },
  { value: "northMacedonia", labelKey: "regions.northMacedonia", defaultCurrency: "MKD", defaultLang: "sq" },
  { value: "diaspora", labelKey: "regions.diaspora", defaultCurrency: "EUR", defaultLang: "en" },
];

export const COUNTRIES = [
  { value: "albania", labelKey: "countries.albania" },
  { value: "kosovo", labelKey: "countries.kosovo" },
  { value: "northMacedonia", labelKey: "countries.northMacedonia" },
  { value: "other", labelKey: "countries.other" },
];

const currencyFormatters: Record<CurrencyCode, Intl.NumberFormat> = {
  ALL: new Intl.NumberFormat("sq-AL", { style: "currency", currency: "ALL", minimumFractionDigits: 0, maximumFractionDigits: 0 }),
  EUR: new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", minimumFractionDigits: 2 }),
  MKD: new Intl.NumberFormat("mk-MK", { style: "currency", currency: "MKD", minimumFractionDigits: 0, maximumFractionDigits: 0 }),
};

/**
 * Format a numeric price with the correct currency symbol/format.
 * Examples:
 *   formatPrice(15000, "ALL") => "15.000 Lekë"
 *   formatPrice(250, "EUR")   => "250,00 €"
 *   formatPrice(8500, "MKD")  => "8.500 ден."
 */
export function formatPrice(amount: number, currency: CurrencyCode = "EUR"): string {
  return currencyFormatters[currency]?.format(amount) ?? `${amount}`;
}

/** Short symbol for display in compact contexts */
export function currencySymbol(currency: CurrencyCode): string {
  const found = SUPPORTED_CURRENCIES.find((c) => c.code === currency);
  return found?.symbol ?? currency;
}

/** Get default currency for a region */
export function getDefaultCurrency(region: Region): CurrencyCode {
  const found = REGIONS.find((r) => r.value === region);
  return found?.defaultCurrency ?? "EUR";
}
