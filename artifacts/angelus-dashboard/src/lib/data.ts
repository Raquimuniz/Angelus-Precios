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