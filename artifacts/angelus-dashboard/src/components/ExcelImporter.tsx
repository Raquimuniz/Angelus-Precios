import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/context/DataContext";
import { AngelusPriceRecord, CompetitionPriceRecord, StockRecord } from "@/lib/data";
import { FileSpreadsheet, RotateCcw } from "lucide-react";

interface LastLoad {
  angelus: AngelusPriceRecord[];
  competencia: CompetitionPriceRecord[];
  stock: StockRecord[];
  label: string;
}

// ── helpers ────────────────────────────────────────────────────────────────────

const generateId = () => Math.random().toString(36).substring(2, 9);

/** Parse "$ 4.59", "BSS 29.57", "5.56" → number */
function parsePrice(v: unknown): number {
  if (v == null) return 0;
  const s = String(v).replace(/[$ ,BSS\s]/gi, "").replace(",", ".").trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/** Remove embedded newlines and trailing extra text from provider names */
function cleanLabel(v: unknown): string {
  if (v == null) return "";
  return String(v).split(/\r\n|\n|\r/)[0].trim();
}

function toStr(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

// ── format detectors ───────────────────────────────────────────────────────────

type RawRow = Record<string, unknown>;

function hasAllCols(row: RawRow, cols: string[]): boolean {
  return cols.every(c => Object.keys(row).some(k => k.trim() === c.trim()));
}

/**
 * FORMAT A — "Mis productos x Droguería"
 * Cols: DESCRIPCIÓN | MÁS BARATO | COBECA03 | DRONENA … (price per droguería)
 * → AngelusPriceRecord[]
 */
function parseFormatA(rows: RawRow[]): AngelusPriceRecord[] {
  const out: AngelusPriceRecord[] = [];
  const excluded = new Set(["DESCRIPCIÓN", "MÁS BARATO"]);

  // Droguería columns = every key except excluded
  const sampleKeys = Object.keys(rows[0] ?? {});
  const drogCols = sampleKeys.filter(k => !excluded.has(k.trim()));

  for (const row of rows) {
    const producto = toStr(row["DESCRIPCIÓN"]).replace(/\(ANGELUS\)/gi, "").trim();
    if (!producto) continue;

    for (const col of drogCols) {
      const precio = parsePrice(row[col]);
      if (precio <= 0) continue; // skip "$ 0.00" (not available)

      out.push({
        id:                 generateId(),
        productoAngelus:    producto,
        presentacion:       "",
        categoria:          "",
        canal:              "Droguería",
        drogueria:          col.trim(),
        tipoCliente:        "Droguería",
        precio,
        fechaActualizacion: new Date().toISOString().slice(0, 10),
        ciudad:             "",
        observaciones:      toStr(row["MÁS BARATO"]),
      });
    }
  }
  return out;
}

/**
 * FORMAT B — "Mis Productos X Otros Laboratorios"
 * Cols: BARRA | MARCA / PROVEEDOR | PRODUCTO | UM | INV | MOLÉCULA | PG | PU | PE | VARIACIÓN
 * → CompetitionPriceRecord[] (droguería channel)
 */
function parseFormatB(rows: RawRow[]): CompetitionPriceRecord[] {
  return rows
    .map(r => {
      const precioCompetidor = parsePrice(r["PU"]);
      if (precioCompetidor <= 0) return null;

      const laboratorio = cleanLabel(r["MARCA / PROVEEDOR"]);
      const productoCompetidor = toStr(r["PRODUCTO"]);
      const molecula = toStr(r["MOLÉCULA"]);

      return {
        id:                        generateId(),
        productoAngelusReferencia: molecula, // molecule as reference link
        productoCompetidor,
        laboratorioCompetidor:     laboratorio,
        presentacionCompetidor:    toStr(r["UM"]),
        categoria:                 "",
        canal:                     "Droguería" as const,
        cliente:                   "Droguería General",
        precioCompetidor,
        fechaActualizacion:        new Date().toISOString().slice(0, 10),
        ciudad:                    "",
        observaciones:             `INV: ${toStr(r["INV"])} | VAR: ${toStr(r["VARIACIÓN"])}`,
      } satisfies CompetitionPriceRecord;
    })
    .filter(Boolean) as CompetitionPriceRecord[];
}

/**
 * FORMAT C — "Productos unificados"
 * Cols: Farmacia | Fecha | Búsqueda | Medicamento | Laboratorio | Concentración | Presentación | Precio $
 * → CompetitionPriceRecord[] (farmacia channel)
 */
function parseFormatC(rows: RawRow[]): CompetitionPriceRecord[] {
  return rows
    .map(r => {
      const precioCompetidor = parsePrice(r["Precio $"]);
      if (precioCompetidor <= 0) return null;

      return {
        id:                        generateId(),
        productoAngelusReferencia: toStr(r["Búsqueda"]),
        productoCompetidor:        toStr(r["Medicamento"]),
        laboratorioCompetidor:     toStr(r["Laboratorio"]),
        presentacionCompetidor:    `${toStr(r["Concentración"])} ${toStr(r["Presentación"])}`.trim(),
        categoria:                 "",
        canal:                     "Farmacia" as const,
        cliente:                   toStr(r["Farmacia"]),
        precioCompetidor,
        fechaActualizacion:        toStr(r["Fecha"]) || new Date().toISOString().slice(0, 10),
        ciudad:                    "",
        observaciones:             "",
      } satisfies CompetitionPriceRecord;
    })
    .filter(Boolean) as CompetitionPriceRecord[];
}

/**
 * Generic fallback parser that tries to map common column names
 * for files the user uploads with a custom structure.
 */
function detectAndParse(rows: RawRow[]): {
  angelus: AngelusPriceRecord[];
  competencia: CompetitionPriceRecord[];
  stock: StockRecord[];
} {
  if (!rows.length) return { angelus: [], competencia: [], stock: [] };

  const keys = Object.keys(rows[0]).map(k => k.trim());

  // Format A — Angelus per droguería pivot
  if (keys.includes("DESCRIPCIÓN") && keys.includes("MÁS BARATO")) {
    return { angelus: parseFormatA(rows), competencia: [], stock: [] };
  }

  // Format B — Competitor catalog (droguería)
  if (keys.includes("MOLÉCULA") && (keys.includes("PU") || keys.includes("PG"))) {
    return { angelus: [], competencia: parseFormatB(rows), stock: [] };
  }

  // Format C — Unified competitor (farmacia retail)
  if (keys.some(k => k === "Búsqueda" || k === "Busqueda") && keys.includes("Farmacia")) {
    return { angelus: [], competencia: parseFormatC(rows), stock: [] };
  }

  // Generic stock sheet
  if (keys.some(k => /stock/i.test(k)) && keys.some(k => /producto/i.test(k))) {
    const stock: StockRecord[] = rows.map(r => {
      const actual  = Number(r["stockActual"] ?? r["Stock Actual"] ?? r["Stock"] ?? 0);
      const minimo  = Number(r["stockMinimoEsperado"] ?? r["Stock Minimo"] ?? r["Minimo"] ?? 0);
      const ideal   = Number(r["stockIdeal"] ?? r["Stock Ideal"] ?? r["Ideal"] ?? 0);
      const rawE    = toStr(r["estadoStock"] ?? r["Estado Stock"] ?? r["Estado"] ?? "");
      const estadoStock: StockRecord["estadoStock"] = (["Quiebre","Crítico","Bajo","Saludable","Sobre Stock"].includes(rawE) ? rawE : actual === 0 ? "Quiebre" : actual < minimo ? "Crítico" : "Saludable") as StockRecord["estadoStock"];
      const rawA    = toStr(r["nivelAlerta"] ?? r["Nivel Alerta"] ?? "");
      const nivelAlerta: StockRecord["nivelAlerta"] = (["Crítico","Alto","Medio","Normal"].includes(rawA) ? rawA : estadoStock === "Quiebre" || estadoStock === "Crítico" ? "Crítico" : "Normal") as StockRecord["nivelAlerta"];
      return {
        id: generateId(),
        productoAngelus:     toStr(r["productoAngelus"] ?? r["Producto Angelus"] ?? r["Producto"]),
        drogueria:           toStr(r["drogueria"] ?? r["Drogueria"] ?? r["Cliente"]),
        stockActual: actual, stockMinimoEsperado: minimo, stockIdeal: ideal,
        ventasPromedio:      Number(r["ventasPromedio"] ?? 0),
        diasInventario:      Number(r["diasInventario"] ?? 0),
        fechaActualizacion:  toStr(r["fechaActualizacion"] ?? r["Fecha"] ?? new Date().toISOString().slice(0,10)),
        estado: rawE, estadoStock, nivelAlerta,
      };
    }).filter(r => r.productoAngelus);
    return { angelus: [], competencia: [], stock };
  }

  return { angelus: [], competencia: [], stock: [] };
}

// ── template generator ─────────────────────────────────────────────────────────

function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  // Sheet 1 — Angelus por droguería (formato real)
  const angelusSample = [
    { "DESCRIPCIÓN": "AMOXICILINA 500MG X30 (ANGELUS)", "MÁS BARATO": "COBECA $ 12.50", "COBECA03": "$ 12.50", "COBECA13": "$ 12.75", "DRONENA": "$ 13.00", "INSUAMINCA (M)": "$ 0.00" },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(angelusSample), "Mis productos x Droguería");

  // Sheet 2 — Competidores droguería
  const compDrogSample = [
    { "BARRA": "12345", "MARCA / PROVEEDOR": "PFIZER", "PRODUCTO": "AMOXIL 500MG X30", "UM": "30", "INV": "50.00", "MOLÉCULA": "AMOXICILINA 500MG", "PG": "BSS 15.00", "PU": "BSS 15.00", "PE": "BSS 15.00", "VARIACIÓN": "0.00 %" },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compDrogSample), "Mis Productos X Otros Labs");

  // Sheet 3 — Competidores farmacias
  const compFarmSample = [
    { "Farmacia": "LOCATEL", "Fecha": "07/05/2026", "Búsqueda": "AMOXICILINA", "Medicamento": "AMOXIL 500MG X30", "Laboratorio": "PFIZER", "Concentración": "500MG", "Presentación": "30 Cápsulas", "Precio $": "14.20" },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compFarmSample), "Productos unificados");

  // Sheet 4 — Stock (manual)
  const stockSample = [
    { productoAngelus: "AMOXICILINA 500MG", drogueria: "COBECA03", stockActual: 250, stockMinimoEsperado: 50, stockIdeal: 300, ventasPromedio: 30, diasInventario: 8, estadoStock: "Saludable", nivelAlerta: "Normal" },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stockSample), "Stock");

  XLSX.writeFile(wb, "Angelus_Plantilla.xlsx");
}

// ── component ──────────────────────────────────────────────────────────────────

export function ExcelImporter() {
  const { setAngelusPrices, setCompetitionPrices, setStockRecords } = useData();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [lastLoad, setLastLoad] = useState<LastLoad | null>(null);

  const applyLoad = (load: LastLoad) => {
    if (load.angelus.length)    setAngelusPrices(load.angelus);
    if (load.competencia.length) setCompetitionPrices(load.competencia);
    if (load.stock.length)      setStockRecords(load.stock);
  };

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (inputRef.current) inputRef.current.value = "";
    if (!files.length) return;

    let totalAngelus = 0, totalComp = 0, totalStock = 0;
    const allAngelus: AngelusPriceRecord[] = [];
    const allComp: CompetitionPriceRecord[] = [];
    const allStock: StockRecord[] = [];
    let errors = 0;

    const processFile = (file: File): Promise<void> =>
      new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const wb = XLSX.read(ev.target?.result, { type: "array" });
            wb.SheetNames.forEach(sheetName => {
              const rows = XLSX.utils.sheet_to_json<RawRow>(wb.Sheets[sheetName]);
              if (!rows.length) return;
              const { angelus, competencia, stock } = detectAndParse(rows);
              allAngelus.push(...angelus);
              allComp.push(...competencia);
              allStock.push(...stock);
              totalAngelus += angelus.length;
              totalComp += competencia.length;
              totalStock += stock.length;
            });
          } catch {
            errors++;
          }
          resolve();
        };
        reader.readAsArrayBuffer(file);
      });

    Promise.all(files.map(processFile)).then(() => {
      const total = totalAngelus + totalComp + totalStock;
      if (total === 0) {
        toast({
          title: "No se reconoció el formato",
          description: errors > 0
            ? "Uno o más archivos no se pudieron leer."
            : "Verifica que los archivos tengan el formato correcto.",
          variant: "destructive",
        });
        return;
      }

      const load: LastLoad = {
        angelus:     allAngelus,
        competencia: allComp,
        stock:       allStock,
        label:       files.map(f => f.name).join(", "),
      };
      setLastLoad(load);
      applyLoad(load);

      const parts: string[] = [];
      if (totalAngelus) parts.push(`${totalAngelus} precios Angelus`);
      if (totalComp)    parts.push(`${totalComp} competencia`);
      if (totalStock)   parts.push(`${totalStock} stock`);
      toast({
        title: `${files.length} archivo${files.length > 1 ? "s" : ""} cargado${files.length > 1 ? "s" : ""}`,
        description: parts.join(" · "),
      });
    });
  };

  const handleReload = () => {
    if (!lastLoad) {
      toast({
        title: "Sin carga previa",
        description: "Primero carga un archivo Excel.",
        variant: "destructive",
      });
      return;
    }
    applyLoad(lastLoad);
    toast({
      title: "Dashboard actualizado",
      description: `Recargado desde: ${lastLoad.label}`,
    });
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
      <Button
        size="sm"
        className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90"
        onClick={() => inputRef.current?.click()}
        title="Cargar 1, 2 o los 3 archivos Excel a la vez"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Cargar Excel
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground"
        onClick={handleReload}
        title={lastLoad ? `Recargar última carga: ${lastLoad.label}` : "Sin carga previa"}
        disabled={!lastLoad}
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
