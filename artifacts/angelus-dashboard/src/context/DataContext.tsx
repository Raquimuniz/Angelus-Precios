import { createContext, useContext, useState, useMemo, ReactNode } from 'react';
import { AngelusPriceRecord, CompetitionPriceRecord, StockRecord, generateSampleData } from '../lib/data';

interface DataContextType {
  angelusPrices: AngelusPriceRecord[];
  setAngelusPrices: (data: AngelusPriceRecord[]) => void;
  /** Competition prices with productoAngelusReferencia mapped to real Angelus product names */
  competitionPrices: CompetitionPriceRecord[];
  setCompetitionPrices: (data: CompetitionPriceRecord[]) => void;
  stockRecords: StockRecord[];
  setStockRecords: (data: StockRecord[]) => void;
  resetToSampleData: () => void;
  isDataLoaded: boolean;
  productNames: string[];
  competitors: string[];
  dataDate: string;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// ── Molecule → Angelus product fuzzy matcher ───────────────────────────────────

function normalizeWords(s: string): string[] {
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3);
}

/**
 * Given a molecule/search string from competitor data and a list of Angelus
 * product names, returns the best-matching Angelus product name (or "" if none).
 */
function mapMoleculeToProduct(molecule: string, angelusProducts: string[]): string {
  if (!molecule || !angelusProducts.length) return '';
  const molWords = normalizeWords(molecule);
  if (!molWords.length) return '';

  let bestScore = 0;
  let bestProduct = '';

  for (const prod of angelusProducts) {
    const prodWords = normalizeWords(prod);
    const overlap = molWords.filter(mw =>
      prodWords.some(pw => pw === mw || pw.startsWith(mw) || mw.startsWith(pw))
    ).length;
    // Normalise by molecule word count so longer matches rank higher
    const score = overlap / molWords.length;
    if (overlap > 0 && score > bestScore) {
      bestScore = score;
      bestProduct = prod;
    }
  }
  return bestScore > 0 ? bestProduct : '';
}

// ── Provider ───────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState(() => generateSampleData());

  const resetToSampleData = () => setData(generateSampleData());

  const isDataLoaded = data.angelusPrices.length > 0 || data.competitionPrices.length > 0;

  const productNames = useMemo(
    () => Array.from(new Set(data.angelusPrices.map(p => p.productoAngelus).filter(Boolean))).sort(),
    [data.angelusPrices]
  );

  /**
   * Shared molecule→product cache builder.
   * Returns mapped array for any list of records that have a string key to remap.
   */
  const angelusProducts = useMemo(
    () => Array.from(new Set(data.angelusPrices.map(p => p.productoAngelus))),
    [data.angelusPrices]
  );

  /**
   * Competition prices where productoAngelusReferencia has been remapped to the
   * closest real Angelus product name (fuzzy word matching).
   */
  const mappedCompetitionPrices = useMemo(() => {
    if (!data.competitionPrices.length || !angelusProducts.length) return data.competitionPrices;
    const cache = new Map<string, string>();
    return data.competitionPrices.map(cp => {
      const ref = cp.productoAngelusReferencia;
      if (!cache.has(ref)) cache.set(ref, mapMoleculeToProduct(ref, angelusProducts));
      const mapped = cache.get(ref)!;
      return mapped ? { ...cp, productoAngelusReferencia: mapped } : cp;
    });
  }, [data.competitionPrices, angelusProducts]);

  /**
   * Stock records where productoAngelus (initially the molecule name from Format B)
   * has been fuzzy-mapped to the closest real Angelus product name.
   */
  const mappedStockRecords = useMemo(() => {
    if (!data.stockRecords.length || !angelusProducts.length) return data.stockRecords;
    const cache = new Map<string, string>();
    return data.stockRecords.map(sr => {
      const ref = sr.productoAngelus;
      if (!cache.has(ref)) cache.set(ref, mapMoleculeToProduct(ref, angelusProducts));
      const mapped = cache.get(ref)!;
      return mapped ? { ...sr, productoAngelus: mapped } : sr;
    });
  }, [data.stockRecords, angelusProducts]);

  const competitors = useMemo(
    () => Array.from(new Set(mappedCompetitionPrices.map(p => p.laboratorioCompetidor).filter(Boolean))).sort(),
    [mappedCompetitionPrices]
  );

  const dataDate = useMemo(() => {
    const dates = [
      ...data.angelusPrices.map(p => p.fechaActualizacion),
      ...data.competitionPrices.map(p => p.fechaActualizacion),
    ].filter(d => d && /\d{2}\/\d{2}\/\d{4}/.test(d));
    if (!dates.length) return '';
    return Array.from(new Set(dates)).sort().pop() ?? '';
  }, [data.angelusPrices, data.competitionPrices]);

  return (
    <DataContext.Provider value={{
      angelusPrices:        data.angelusPrices,
      setAngelusPrices:     (prices)  => setData(prev => ({ ...prev, angelusPrices: prices })),
      competitionPrices:    mappedCompetitionPrices,
      setCompetitionPrices: (prices)  => setData(prev => ({ ...prev, competitionPrices: prices })),
      stockRecords:         mappedStockRecords,
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
