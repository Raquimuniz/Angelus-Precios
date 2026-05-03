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
  productoAngelus: string;
  drogueria: string;
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
  const angelusPrices: AngelusPriceRecord[] = [];
  const competitionPrices: CompetitionPriceRecord[] = [];
  const stockRecords: StockRecord[] = [];

  const now = new Date().toISOString();

  PRODUCTS.forEach((prod, idx) => {
    const basePrice = 5 + (idx * 2) + Math.random() * 5; // $5 to $40 approx
    
    // Generate Angelus Prices
    DROGUERIAS.forEach(drogueria => {
      if (Math.random() > 0.2) { // 80% coverage
        let price = basePrice * (0.8 + Math.random() * 0.4); // ±20% variation
        // Create critical variations
        if (Math.random() > 0.9) price *= 1.4; 
        
        angelusPrices.push({
          id: generateId(),
          productoAngelus: prod.name,
          presentacion: prod.pres,
          categoria: prod.cat,
          canal: "Droguería",
          drogueria,
          tipoCliente: "Droguería",
          precio: Number(price.toFixed(2)),
          fechaActualizacion: now,
          ciudad: CITIES[Math.floor(Math.random() * CITIES.length)]
        });
      }
    });

    FARMACIAS.forEach(farmacia => {
      if (Math.random() > 0.3) {
        // Usually higher than drogueria
        let price = basePrice * (1.1 + Math.random() * 0.4); 
        // 5% chance of farmacia being cheaper than drogueria (Alert)
        if (Math.random() > 0.95) price = basePrice * 0.7;

        angelusPrices.push({
          id: generateId(),
          productoAngelus: prod.name,
          presentacion: prod.pres,
          categoria: prod.cat,
          canal: "Farmacia",
          drogueria: farmacia,
          tipoCliente: "Cadena de Farmacia",
          precio: Number(price.toFixed(2)),
          fechaActualizacion: now,
          ciudad: CITIES[Math.floor(Math.random() * CITIES.length)]
        });
      }
    });

    // Generate Competition Prices (for most products)
    if (Math.random() > 0.2) {
      const compLab = COMPETITORS[Math.floor(Math.random() * COMPETITORS.length)];
      
      DROGUERIAS.concat(FARMACIAS).forEach(cliente => {
        if (Math.random() > 0.5) {
          const isDrog = DROGUERIAS.includes(cliente);
          // Sometimes cheaper, sometimes more expensive
          const compPrice = basePrice * (isDrog ? 0.9 : 1.2) * (0.7 + Math.random() * 0.6);
          
          competitionPrices.push({
            id: generateId(),
            productoAngelusReferencia: prod.name,
            productoCompetidor: `Comp ${prod.name.split(' ')[0]}`,
            laboratorioCompetidor: compLab,
            presentacionCompetidor: prod.pres,
            categoria: prod.cat,
            canal: isDrog ? "Droguería" : "Farmacia",
            cliente,
            precioCompetidor: Number(compPrice.toFixed(2)),
            fechaActualizacion: now,
            ciudad: CITIES[Math.floor(Math.random() * CITIES.length)]
          });
        }
      });
    }

    // Generate Stock Records
    DROGUERIAS.forEach(drogueria => {
      if (Math.random() > 0.1) {
        const ventasPromedio = Math.floor(10 + Math.random() * 100);
        const stockIdeal = ventasPromedio * 30;
        const stockMinimoEsperado = ventasPromedio * 7;
        
        let stockActual;
        const r = Math.random();
        if (r < 0.05) stockActual = 0; // Quiebre
        else if (r < 0.15) stockActual = Math.floor(stockMinimoEsperado * 0.5); // Crítico
        else if (r < 0.3) stockActual = Math.floor(stockIdeal * 0.5); // Bajo
        else if (r < 0.8) stockActual = Math.floor(stockIdeal * 0.9); // Saludable
        else stockActual = Math.floor(stockIdeal * 1.5); // Sobre stock

        const diasInventario = stockActual === 0 ? 0 : Math.round(stockActual / ventasPromedio);
        
        let estadoStock: StockRecord['estadoStock'] = "Saludable";
        let nivelAlerta: StockRecord['nivelAlerta'] = "Normal";

        if (stockActual === 0) { estadoStock = "Quiebre"; nivelAlerta = "Crítico"; }
        else if (stockActual < stockMinimoEsperado) { estadoStock = "Crítico"; nivelAlerta = "Alto"; }
        else if (stockActual < stockIdeal * 0.7) { estadoStock = "Bajo"; nivelAlerta = "Medio"; }
        else if (stockActual > stockIdeal * 1.2) { estadoStock = "Sobre Stock"; nivelAlerta = "Normal"; }

        stockRecords.push({
          id: generateId(),
          productoAngelus: prod.name,
          drogueria,
          stockActual,
          stockMinimoEsperado,
          stockIdeal,
          ventasPromedio,
          diasInventario,
          fechaActualizacion: now,
          estado: CITIES[Math.floor(Math.random() * CITIES.length)],
          estadoStock,
          nivelAlerta
        });
      }
    });
  });

  return { angelusPrices, competitionPrices, stockRecords };
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