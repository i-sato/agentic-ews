import React, { createContext, useContext, useState, useEffect } from "react";

interface YearContextType {
  selectedYear: number;
  setSelectedYear: (year: number) => void;
  availableYears: number[];
}

const YearContext = createContext<YearContextType | undefined>(undefined);

export function YearProvider({ children }: { children: React.ReactNode }) {
  const [selectedYear, setSelectedYearState] = useState<number>(() => {
    const saved = localStorage.getItem("taldig_selected_year");
    return saved ? parseInt(saved, 10) : 2026;
  });

  const availableYears = [2026, 2025, 2024];

  const setSelectedYear = (year: number) => {
    setSelectedYearState(year);
    localStorage.setItem("taldig_selected_year", year.toString());
  };

  return (
    <YearContext.Provider value={{ selectedYear, setSelectedYear, availableYears }}>
      {children}
    </YearContext.Provider>
  );
}

export function useYear() {
  const context = useContext(YearContext);
  if (!context) {
    throw new Error("useYear must be used within a YearProvider");
  }
  return context;
}
