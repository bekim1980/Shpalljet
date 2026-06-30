import { createContext, useContext, useState, ReactNode } from "react";

export type Vertical = "luxe" | "market" | "rent" | "services" | "jobs";

export const VERTICALS: { value: Vertical; label: string; description: string }[] = [
  { value: "luxe", label: "LUXE", description: "Artikuj luksi të përzgjedhur" },
  { value: "market", label: "MARKET", description: "Gjithçka në një vend" },
  { value: "rent", label: "RENT", description: "Qira & pasuri të paluajtshme" },
  { value: "services", label: "SERVICES", description: "Shërbime profesionale" },
  { value: "jobs", label: "JOBS", description: "Punë & punësim" },
];

interface VerticalContextType {
  vertical: Vertical;
  setVertical: (v: Vertical) => void;
}

const VerticalContext = createContext<VerticalContextType>({
  vertical: "luxe",
  setVertical: () => {},
});

export const VerticalProvider = ({ children }: { children: ReactNode }) => {
  const [vertical, setVertical] = useState<Vertical>("luxe");
  return (
    <VerticalContext.Provider value={{ vertical, setVertical }}>
      {children}
    </VerticalContext.Provider>
  );
};

export const useVertical = () => useContext(VerticalContext);
