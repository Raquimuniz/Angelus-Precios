export interface AngelusPriceRecord {
  id: string;
  productoAngelus: string;
  presentacion: string;
  categoria: string;
  canal: "Droguería" | "Farmacia";
  drogueria: string;
  tipoCliente: "Droguería" | "Farmacia Independiente" | "Cadena de Farmacia" | "Farmacia Online";
  precio: number;
  fechaActualizacion: string;
  ciudad: string;
  observaciones?: string;
}

export interface CompetitionPriceRecord {
  id: string;
  productoAngelusReferencia: string;
  productoCompetidor: string;
  laboratorioCompetidor: string;
  presentacionCompetidor: string;
  categoria: string;
  canal: "Droguería" | "Farmacia";
  cliente: string;
  precioCompetidor: number;
  fechaActualizacion: string;
  ciudad: string;
  observaciones?: string;
}

export interface StockRecord {
  id: string;
  /** Molecule/Angelus product name (fuzzy-mapped in DataContext) */
  productoAngelus: string;
  /** Competitor lab name (MARCA / PROVEEDOR) */
  drogueria: string;
  /** Competitor product name (PRODUCTO column) */
  productoCompetidor?: string;
  stockActual: number;
  stockMinimoEsperado: number;
  stockIdeal: number;
  ventasPromedio: number;
  diasInventario: number;
  fechaActualizacion: string;
  estado: string;
  estadoStock: "Quiebre" | "Crítico" | "Bajo" | "Saludable" | "Sobre Stock";
  nivelAlerta: "Crítico" | "Alto" | "Medio" | "Normal";
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const PRODUCTS = [
  { name: "Amoxicilina 500mg", pres: "Caja x30 Cap", cat: "Antibióticos" },
  { name: "Ibuprofeno 400mg", pres: "Caja x20 Tab", cat: "Analgésicos/AINES" },
  { name: "Losartán 50mg", pres: "Caja x30 Tab", cat: "Cardiovascular" },
  { name: "Metformina 850mg", pres: "Caja x30 Tab", cat: "Diabetes" },
  { name: "Omeprazol 20mg", pres: "Caja x14 Cap", cat: "Gastrointestinal" },
  { name: "Atorvastatina 20mg", pres: "Caja x30 Tab", cat: "Cardiovascular" },
  { name: "Amlodipino 5mg", pres: "Caja x30 Tab", cat: "Cardiovascular" },
  { name: "Ciprofloxacina 500mg", pres: "Caja x10 Tab", cat: "Antibióticos" },
  { name: "Diclofenaco 50mg", pres: "Caja x20 Tab", cat: "Analgésicos/AINES" },
  { name: "Metronidazol 500mg", pres: "Caja x20 Tab", cat: "Antibióticos" },
  { name: "Azitromicina 500mg", pres: "Caja x3 Tab", cat: "Antibióticos" },
  { name: "Captopril 25mg", pres: "Caja x30 Tab", cat: "Cardiovascular" },
  { name: "Glibenclamida 5mg", pres: "Caja x30 Tab", cat: "Diabetes" },
  { name: "Hidroclorotiazida 25mg", pres: "Caja x30 Tab", cat: "Cardiovascular" },
  { name: "Ranitidina 150mg", pres: "Caja x20 Tab", cat: "Gastrointestinal" },
  { name: "Paracetamol 500mg", pres: "Caja x20 Tab", cat: "Analgésicos/AINES" },
  { name: "Dexametasona 4mg", pres: "Caja x10 Amp", cat: "Corticosteroides" },
  { name: "Vitamina C 1g", pres: "Caja x30 Tab", cat: "Vitaminas" },
];

export const DROGUERIAS = ["Farmatodo Mayorista", "Cobeca", "Locatel Droguería", "Sumedico", "Distribuidora SLF"];
export const FARMACIAS = ["Farmatodo", "Locatel", "Farmahorro", "Cruz Verde", "Farmacia El Ávila", "Farmacia Popular", "Farma24", "Devlyn Farmacias"];
export const CITIES = ["Caracas", "Maracaibo", "Valencia", "Barquisimeto", "Maracay"];
export const COMPETITORS = ["Laboratorios Pfizer", "Bayer", "Roche", "GlaxoSmithKline", "Sanofi", "Novartis"];

export function generateSampleData() {
  return {
    angelusPrices:    [] as AngelusPriceRecord[],
    competitionPrices: [] as CompetitionPriceRecord[],
    stockRecords:     [] as StockRecord[],
  };
}

// ── Historical monthly price data for line charts ─────────────────────────────
// Returns 7 months of average prices per product (Angelus) and per competitor

export const MONTHS = ["Nov", "Dic", "Ene", "Feb", "Mar", "Abr", "May"];

export interface PriceHistoryPoint {
  mes: string;
  [product: string]: number | string;
}

// Shared base prices used across history generators
export const BASE_PRICES: Record<string, number> = {
  "Amoxicilina 500mg":      12.50,
  "Ibuprofeno 400mg":        8.20,
  "Losartán 50mg":          14.80,
  "Metformina 850mg":       10.60,
  "Omeprazol 20mg":         16.90,
  "Atorvastatina 20mg":     22.40,
  "Amlodipino 5mg":         18.70,
  "Ciprofloxacina 500mg":   26.30,
  "Diclofenaco 50mg":        9.10,
  "Metronidazol 500mg":     11.50,
  "Azitromicina 500mg":     28.80,
  "Captopril 25mg":          7.40,
  "Glibenclamida 5mg":       6.80,
  "Hidroclorotiazida 25mg":  5.90,
  "Ranitidina 150mg":       13.20,
  "Paracetamol 500mg":       4.50,
  "Dexametasona 4mg":       19.60,
  "Vitamina C 1g":           8.90,
};

// Per-competitor price multiplier and drift offset (deterministic)
const COMP_PROFILES: Record<string, { mult: number; drift: number }> = {
  "Laboratorios Pfizer": { mult: 1.12, drift:  0.003 },
  "Bayer":               { mult: 1.08, drift:  0.005 },
  "Roche":               { mult: 1.18, drift:  0.002 },
  "GlaxoSmithKline":     { mult: 1.05, drift:  0.007 },
  "Sanofi":              { mult: 0.98, drift:  0.004 },
  "Novartis":            { mult: 1.15, drift:  0.001 },
};

/**
 * Generates deterministic monthly price history for a given list of products.
 * Each product gets its own line on the chart.
 */
export function generatePriceHistory(
  products: string[],
  canal: "Droguería" | "Farmacia" = "Droguería"
): PriceHistoryPoint[] {
  const canalMult = canal === "Farmacia" ? 1.22 : 1.0;
  const drifts    = [0.0, 0.012, 0.008, 0.019, 0.011, 0.025, 0.014];

  return MONTHS.map((mes, mIdx) => {
    const point: PriceHistoryPoint = { mes };
    const cumDrift  = drifts.slice(0, mIdx + 1).reduce((a, b) => a + b, 0);
    const noiseSeed = mIdx * 0.003;

    products.forEach((prod, pIdx) => {
      const base      = (BASE_PRICES[prod] ?? 10) * canalMult;
      const prodDrift = cumDrift + (pIdx % 3 === 0 ? noiseSeed : -noiseSeed / 2);
      point[prod]     = Number((base * (1 + prodDrift)).toFixed(2));
    });

    return point;
  });
}

/**
 * Generates monthly history for Angelus products AND competitor labs simultaneously.
 * Each product/competitor gets its own line.
 * Product lines are prefixed with "Angelus · ", competitor lines with the lab name.
 */
export function generateCompVsCompHistory(
  products: string[],
  competitors: string[],
  canal: "Droguería" | "Farmacia" = "Droguería"
): { history: PriceHistoryPoint[]; productKeys: string[]; competitorKeys: string[] } {
  const canalMult   = canal === "Farmacia" ? 1.22 : 1.0;
  const drifts      = [0.0, 0.012, 0.008, 0.019, 0.011, 0.025, 0.014];

  const productKeys    = products.map(p => `${p}`);
  const competitorKeys = competitors.map(c => `${c}`);

  const history = MONTHS.map((mes, mIdx) => {
    const point: PriceHistoryPoint = { mes };
    const cumDrift = drifts.slice(0, mIdx + 1).reduce((a, b) => a + b, 0);

    // Angelus product lines (average across competitors for that product)
    products.forEach((prod, pIdx) => {
      const base     = (BASE_PRICES[prod] ?? 10) * canalMult;
      const drift    = cumDrift + pIdx * 0.001;
      point[prod]    = Number((base * (1 + drift)).toFixed(2));
    });

    // Competitor lines (their average price across selected products)
    competitors.forEach(comp => {
      const profile  = COMP_PROFILES[comp] ?? { mult: 1.1, drift: 0.003 };
      // Average competitor price across selected products
      const avgBase  = products.length
        ? products.reduce((sum, prod) => sum + (BASE_PRICES[prod] ?? 10), 0) / products.length
        : 12;
      const base     = avgBase * canalMult * profile.mult;
      const drift    = cumDrift + profile.drift * mIdx;
      point[comp]    = Number((base * (1 + drift)).toFixed(2));
    });

    return point;
  });

  return { history, productKeys, competitorKeys };
}

/**
 * ONE product vs MULTIPLE competitors — the primary chart function.
 * Returns monthly history with:
 *   "Angelus" → Angelus price for this product
 *   "<LabName>" → that competitor's price for this product
 */
export function generateProductVsCompetitors(
  product: string,
  competitors: string[],
  canal: "Droguería" | "Farmacia" = "Droguería"
): PriceHistoryPoint[] {
  const canalMult  = canal === "Farmacia" ? 1.22 : 1.0;
  const base       = (BASE_PRICES[product] ?? 12) * canalMult;
  const drifts     = [0.0, 0.010, 0.006, 0.014, 0.009, 0.020, 0.012];

  return MONTHS.map((mes, i) => {
    const aDrift = drifts.slice(0, i + 1).reduce((a, b) => a + b, 0);
    const point: PriceHistoryPoint = {
      mes,
      Angelus: Number((base * (1 + aDrift)).toFixed(2)),
    };
    competitors.forEach(comp => {
      const profile = COMP_PROFILES[comp] ?? { mult: 1.1, drift: 0.004 };
      const cBase   = base * profile.mult;
      const cDrift  = drifts.slice(0, i + 1).reduce((a, b) => a + b, 0) + profile.drift * i;
      point[comp]   = Number((cBase * (1 + cDrift)).toFixed(2));
    });
    return point;
  });
}

/**
 * Generates monthly Angelus avg vs Competencia avg price history for a single product.
 */
export function generateProductHistory(productoAngelus: string, canal: "Droguería" | "Farmacia" = "Droguería") {
  const basePrices: Record<string, number> = {
    "Amoxicilina 500mg":    12.50,
    "Ibuprofeno 400mg":     8.20,
    "Losartán 50mg":        14.80,
    "Metformina 850mg":     10.60,
    "Omeprazol 20mg":       16.90,
    "Atorvastatina 20mg":   22.40,
    "Amlodipino 5mg":       18.70,
    "Ciprofloxacina 500mg": 26.30,
    "Diclofenaco 50mg":     9.10,
    "Metronidazol 500mg":   11.50,
    "Azitromicina 500mg":   28.80,
    "Captopril 25mg":       7.40,
    "Glibenclamida 5mg":    6.80,
    "Hidroclorotiazida 25mg": 5.90,
    "Ranitidina 150mg":     13.20,
    "Paracetamol 500mg":    4.50,
    "Dexametasona 4mg":     19.60,
    "Vitamina C 1g":        8.90,
  };

  const canalMult = canal === "Farmacia" ? 1.22 : 1.0;
  const base = (basePrices[productoAngelus] ?? 12) * canalMult;
  const compBase = base * 1.08; // competitor slightly higher at start

  // Angelus has moderate upward drift; competitor grows faster → alert signal
  const angelusDrifts = [0.0, 0.010, 0.006, 0.014, 0.009, 0.020, 0.012];
  const compDrifts    = [0.0, 0.014, 0.011, 0.022, 0.018, 0.031, 0.025];

  return MONTHS.map((mes, i) => {
    const aDrift = angelusDrifts.slice(0, i + 1).reduce((a, b) => a + b, 0);
    const cDrift = compDrifts.slice(0, i + 1).reduce((a, b) => a + b, 0);
    return {
      mes,
      Angelus:      Number((base * (1 + aDrift)).toFixed(2)),
      Competencia:  Number((compBase * (1 + cDrift)).toFixed(2)),
    };
  });
}

/**
 * Generates deterministic monthly stock history for a product at a given droguería.
 * Simulates a partial stock crisis (drop then recovery) for realism.
 */
export function generateStockHistory(
  product: string,
  drogueria: string
): { mes: string; stockActual: number; stockMinimo: number; stockIdeal: number }[] {
  const prodIdx  = PRODUCTS.findIndex(p => p.name === product);
  const drogIdx  = DROGUERIAS.indexOf(drogueria);
  const seed     = (prodIdx < 0 ? 5 : prodIdx) * 31 + (drogIdx < 0 ? 2 : drogIdx) * 17;
  const baseStock = 120 + (seed % 180); // 120–300
  const minStock  = Math.round(baseStock * 0.20);
  const idealStock = baseStock;

  // Different crisis shapes per seed
  const shapeIdx = seed % 4;
  const patterns: number[][] = [
    [1.0, 0.85, 0.65, 0.40, 0.60, 0.80, 0.95],  // gradual drop then recovery
    [0.90, 0.70, 0.45, 0.15, 0.30, 0.65, 0.85],  // severe crisis
    [1.0, 0.95, 0.88, 0.75, 0.90, 1.05, 1.10],   // mild dip + overstock
    [0.85, 0.60, 0.30, 0.05, 0.40, 0.75, 0.90],  // quiebre + restocking
  ];
  const pattern = patterns[shapeIdx];

  return MONTHS.map((mes, i) => ({
    mes,
    stockActual:  Math.max(0, Math.round(baseStock * pattern[i])),
    stockMinimo:  minStock,
    stockIdeal:   idealStock,
  }));
}