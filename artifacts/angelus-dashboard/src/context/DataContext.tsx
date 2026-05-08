import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { AngelusPriceRecord, CompetitionPriceRecord, StockRecord, generateSampleData } from '../lib/data';

interface DataContextType {
  angelusPrices: AngelusPriceRecord[];
  setAngelusPrices: (data: AngelusPriceRecord[]) => void;
  competitionPrices: CompetitionPriceRecord[];
  setCompetitionPrices: (data: CompetitionPriceRecord[]) => void;
  stockRecords: StockRecord[];
  setStockRecords: (data: StockRecord[]) => void;
  resetToSampleData: () => void;
  /** True once at least one Excel file has been loaded */
  isDataLoaded: boolean;
  /** Unique product names derived from loaded angelusPrices */
  productNames: string[];
  /** Unique competitor/lab names derived from loaded competitionPrices */
  competitors: string[];
  /** Dates present in loaded records */
  dataDate: string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(() => generateSampleData());

  const resetToSampleData = () => setData(generateSampleData());

  const isDataLoaded = data.angelusPrices.length > 0 || data.competitionPrices.length > 0;

  const productNames = useMemo(
    () => Array.from(new Set(data.angelusPrices.map(p => p.productoAngelus).filter(Boolean))).sort(),
    [data.angelusPrices]
  );

  const competitors = useMemo(
    () => Array.from(new Set(data.competitionPrices.map(p => p.laboratorioCompetidor).filter(Boolean))).sort(),
    [data.competitionPrices]
  );

  const dataDate = useMemo(() => {
    const dates = [
      ...data.angelusPrices.map(p => p.fechaActualizacion),
      ...data.competitionPrices.map(p => p.fechaActualizacion),
    ].filter(Boolean).filter(d => !d.startsWith("2025") && !d.startsWith("2024"));
    if (!dates.length) return "";
    const unique = Array.from(new Set(dates)).sort();
    return unique[unique.length - 1];
  }, [data.angelusPrices, data.competitionPrices]);

  return (
    <DataContext.Provider value={{
      angelusPrices:        data.angelusPrices,
      setAngelusPrices:     (prices)  => setData(prev => ({ ...prev, angelusPrices: prices })),
      competitionPrices:    data.competitionPrices,
      setCompetitionPrices: (prices)  => setData(prev => ({ ...prev, competitionPrices: prices })),
      stockRecords:         data.stockRecords,
      setStockRecords:      (records) => setData(prev => ({ ...prev, stockRecords: records })),
      resetToSampleData,
      isDataLoaded,
      productNames,
      competitors,
      dataDate,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}
