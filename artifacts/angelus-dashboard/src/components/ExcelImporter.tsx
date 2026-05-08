import { useRef } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useData } from "@/context/DataContext";
import { AngelusPriceRecord, CompetitionPriceRecord, StockRecord } from "@/lib/data";
import { FileSpreadsheet, Download, RotateCcw } from "lucide-react";

const generateId = () => Math.random().toString(36).substring(2, 9);

// ── helpers ────────────────────────────────────────────────────────────────────

function toNum(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function toStr(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

function parseAngelusSheet(rows: Record<string, unknown>[]): AngelusPriceRecord[] {
  return rows.map((r) => ({
    id:                 generateId(),
    productoAngelus:    toStr(r["productoAngelus"]    ?? r["Producto Angelus"]    ?? r["producto"]),
    presentacion:       toStr(r["presentacion"]       ?? r["Presentacion"]        ?? ""),
    categoria:          toStr(r["categoria"]          ?? r["Categoria"]           ?? ""),
    canal:              (toStr(r["canal"] ?? r["Canal"]) as "Droguería" | "Farmacia") || "Droguería",
    drogueria:          toStr(r["drogueria"]           ?? r["Drogueria"]          ?? r["Cliente"]),
    tipoCliente:        (toStr(r["tipoCliente"]        ?? r["Tipo Cliente"]       ?? "Droguería") as AngelusPriceRecord["tipoCliente"]),
    precio:             toNum(r["precio"]              ?? r["Precio"]),
    fechaActualizacion: toStr(r["fechaActualizacion"]  ?? r["Fecha"]              ?? new Date().toISOString()),
    ciudad:             toStr(r["ciudad"]              ?? r["Ciudad"]             ?? ""),
    observaciones:      toStr(r["observaciones"]       ?? r["Observaciones"]      ?? ""),
  })).filter(r => r.productoAngelus && r.precio > 0);
}

function parseCompetenciaSheet(rows: Record<string, unknown>[]): CompetitionPriceRecord[] {
  return rows.map((r) => ({
    id:                        generateId(),
    productoAngelusReferencia: toStr(r["productoAngelusReferencia"] ?? r["Producto Angelus Referencia"] ?? r["productoAngelus"] ?? r["Producto Angelus"]),
    productoCompetidor:        toStr(r["productoCompetidor"]        ?? r["Producto Competidor"]         ?? r["Competidor"]),
    laboratorioCompetidor:     toStr(r["laboratorioCompetidor"]     ?? r["Laboratorio"]                ?? ""),
    presentacionCompetidor:    toStr(r["presentacionCompetidor"]    ?? r["Presentacion Competidor"]    ?? ""),
    categoria:                 toStr(r["categoria"]                 ?? r["Categoria"]                  ?? ""),
    canal:                     (toStr(r["canal"] ?? r["Canal"]) as "Droguería" | "Farmacia") || "Droguería",
    cliente:                   toStr(r["cliente"]                   ?? r["Cliente"]                    ?? ""),
    precioCompetidor:          toNum(r["precioCompetidor"]          ?? r["Precio Competidor"]          ?? r["Precio"]),
    fechaActualizacion:        toStr(r["fechaActualizacion"]        ?? r["Fecha"]                      ?? new Date().toISOString()),
    ciudad:                    toStr(r["ciudad"]                    ?? r["Ciudad"]                     ?? ""),
    observaciones:             toStr(r["observaciones"]             ?? r["Observaciones"]              ?? ""),
  })).filter(r => r.productoAngelusReferencia && r.precioCompetidor > 0);
}

function parseStockSheet(rows: Record<string, unknown>[]): StockRecord[] {
  return rows.map((r) => {
    const actual   = toNum(r["stockActual"]         ?? r["Stock Actual"]   ?? r["Stock"]);
    const minimo   = toNum(r["stockMinimoEsperado"] ?? r["Stock Minimo"]   ?? r["Minimo"]);
    const ideal    = toNum(r["stockIdeal"]          ?? r["Stock Ideal"]    ?? r["Ideal"]);
    const dias     = toNum(r["diasInventario"]       ?? r["Dias"]          ?? 0);
    const rawEstado = toStr(r["estadoStock"] ?? r["Estado Stock"] ?? r["Estado"]);
    const estadoStock = (["Quiebre","Crítico","Bajo","Saludable","Sobre Stock"].includes(rawEstado)
      ? rawEstado : actual === 0 ? "Quiebre" : actual < minimo ? "Crítico" : "Saludable"
    ) as StockRecord["estadoStock"];
    const rawAlerta = toStr(r["nivelAlerta"] ?? r["Nivel Alerta"] ?? "");
    const nivelAlerta = (["Crítico","Alto","Medio","Normal"].includes(rawAlerta)
      ? rawAlerta : estadoStock === "Quiebre" || estadoStock === "Crítico" ? "Crítico" : "Normal"
    ) as StockRecord["nivelAlerta"];

    return {
      id:                 generateId(),
      productoAngelus:    toStr(r["productoAngelus"]    ?? r["Producto Angelus"] ?? r["Producto"]),
      drogueria:          toStr(r["drogueria"]           ?? r["Drogueria"]        ?? r["Cliente"]),
      stockActual:        actual,
      stockMinimoEsperado: minimo,
      stockIdeal:         ideal,
      ventasPromedio:     toNum(r["ventasPromedio"]      ?? r["Ventas Promedio"]  ?? 0),
      diasInventario:     dias,
      fechaActualizacion: toStr(r["fechaActualizacion"]  ?? r["Fecha"]            ?? new Date().toISOString()),
      estado:             rawEstado,
      estadoStock,
      nivelAlerta,
    };
  }).filter(r => r.productoAngelus);
}

// ── template generator ─────────────────────────────────────────────────────────

function downloadTemplate() {
  const wb = XLSX.utils.book_new();

  const angelusCols = [
    "productoAngelus","presentacion","categoria","canal","drogueria",
    "tipoCliente","precio","fechaActualizacion","ciudad","observaciones",
  ];
  const angelusSample = [{
    productoAngelus: "Amoxicilina 500mg", presentacion: "Caja x30 Cap",
    categoria: "Antibióticos", canal: "Droguería", drogueria: "Cobeca",
    tipoCliente: "Droguería", precio: 12.50,
    fechaActualizacion: new Date().toISOString().slice(0, 10),
    ciudad: "Caracas", observaciones: "",
  }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(angelusSample, { header: angelusCols }), "Precios Angelus");

  const compCols = [
    "productoAngelusReferencia","productoCompetidor","laboratorioCompetidor",
    "presentacionCompetidor","categoria","canal","cliente","precioCompetidor",
    "fechaActualizacion","ciudad","observaciones",
  ];
  const compSample = [{
    productoAngelusReferencia: "Amoxicilina 500mg", productoCompetidor: "Amoxil 500mg",
    laboratorioCompetidor: "Pfizer", presentacionCompetidor: "Caja x30 Cap",
    categoria: "Antibióticos", canal: "Droguería", cliente: "Locatel Droguería",
    precioCompetidor: 14.20,
    fechaActualizacion: new Date().toISOString().slice(0, 10),
    ciudad: "Caracas", observaciones: "",
  }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compSample, { header: compCols }), "Precios Competencia");

  const stockCols = [
    "productoAngelus","drogueria","stockActual","stockMinimoEsperado",
    "stockIdeal","ventasPromedio","diasInventario","fechaActualizacion",
    "estadoStock","nivelAlerta",
  ];
  const stockSample = [{
    productoAngelus: "Amoxicilina 500mg", drogueria: "Cobeca",
    stockActual: 250, stockMinimoEsperado: 50, stockIdeal: 300,
    ventasPromedio: 30, diasInventario: 8,
    fechaActualizacion: new Date().toISOString().slice(0, 10),
    estadoStock: "Saludable", nivelAlerta: "Normal",
  }];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stockSample, { header: stockCols }), "Stock");

  XLSX.writeFile(wb, "Angelus_Plantilla.xlsx");
}

// ── component ──────────────────────────────────────────────────────────────────

export function ExcelImporter() {
  const { setAngelusPrices, setCompetitionPrices, setStockRecords, resetToSampleData } = useData();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!inputRef.current) return;
    inputRef.current.value = "";           // allow re-selecting same file
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target?.result, { type: "array" });

        let angelusLoaded = 0, compLoaded = 0, stockLoaded = 0;

        // Accept multiple possible sheet-name spellings
        const sheetMatch = (names: string[]) =>
          wb.SheetNames.find(n => names.some(m => n.toLowerCase().includes(m.toLowerCase())));

        const angelusSheet = sheetMatch(["precios angelus","angelus precio","angelus"]);
        const compSheet    = sheetMatch(["competencia","competidor","comp"]);
        const stockSheet   = sheetMatch(["stock"]);

        if (angelusSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[angelusSheet]);
          const parsed = parseAngelusSheet(rows);
          if (parsed.length) { setAngelusPrices(parsed); angelusLoaded = parsed.length; }
        }
        if (compSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[compSheet]);
          const parsed = parseCompetenciaSheet(rows);
          if (parsed.length) { setCompetitionPrices(parsed); compLoaded = parsed.length; }
        }
        if (stockSheet) {
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[stockSheet]);
          const parsed = parseStockSheet(rows);
          if (parsed.length) { setStockRecords(parsed); stockLoaded = parsed.length; }
        }

        const total = angelusLoaded + compLoaded + stockLoaded;
        if (total === 0) {
          toast({
            title: "No se encontraron datos",
            description: "Verifica que el archivo tenga las hojas correctas: 'Precios Angelus', 'Precios Competencia', 'Stock'.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Excel cargado correctamente",
            description: `${angelusLoaded} precios Angelus · ${compLoaded} competencia · ${stockLoaded} stock`,
          });
        }
      } catch (err) {
        toast({
          title: "Error al leer el archivo",
          description: "Asegúrate de que sea un archivo .xlsx o .xls válido.",
          variant: "destructive",
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => downloadTemplate()}
        title="Descargar plantilla Excel con el formato correcto"
      >
        <Download className="h-3.5 w-3.5" />
        Plantilla
      </Button>
      <Button
        size="sm"
        className="h-8 gap-1.5 text-xs bg-primary hover:bg-primary/90"
        onClick={() => inputRef.current?.click()}
        title="Cargar datos desde un archivo Excel de tu computadora"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        Cargar Excel
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 gap-1.5 text-xs text-muted-foreground"
        onClick={() => { resetToSampleData(); toast({ title: "Datos de ejemplo restaurados" }); }}
        title="Volver a los datos de muestra"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
