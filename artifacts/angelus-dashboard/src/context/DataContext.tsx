import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AngelusPriceRecord, CompetitionPriceRecord, StockRecord, generateSampleData } from '../lib/data';

interface DataContextType {
  angelusPrices: AngelusPriceRecord[];
  setAngelusPrices: (data: AngelusPriceRecord[]) => void;
  competitionPrices: CompetitionPriceRecord[];
  setCompetitionPrices: (data: CompetitionPriceRecord[]) => void;
  stockRecords: StockRecord[];
  setStockRecords: (data: StockRecord[]) => void;
  resetToSampleData: () => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(() => generateSampleData());

  const resetToSampleData = () => {
    setData(generateSampleData());
  };

  return (
    <DataContext.Provider value={{
      angelusPrices: data.angelusPrices,
      setAngelusPrices: (prices) => setData(prev => ({ ...prev, angelusPrices: prices })),
      competitionPrices: data.competitionPrices,
      setCompetitionPrices: (prices) => setData(prev => ({ ...prev, competitionPrices: prices })),
      stockRecords: data.stockRecords,
      setStockRecords: (records) => setData(prev => ({ ...prev, stockRecords: records })),
      resetToSampleData
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}