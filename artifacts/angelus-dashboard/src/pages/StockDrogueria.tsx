import { useState, useEffect } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileSpreadsheet } from "lucide-react";

export default function StockDrogueria() {
  const { stockRecords, productNames, isDataLoaded } = useData();

  const [filterDrogueria, setFilterDrogueria] = useState<string>("Todas");
  const [filterProducto,  setFilterProducto]  = useState("");

  const filteredStock = stockRecords.filter(s => {
    if (filterDrogueria !== "Todas" && s.drogueria !== filterDrogueria) return false;
    if (filterProducto && !s.productoAngelus.toLowerCase().includes(filterProducto.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const m: Record<string, number> = { "Crítico": 4, "Alto": 3, "Medio": 2, "Normal": 1 };
    return (m[b.nivelAlerta] || 0) - (m[a.nivelAlerta] || 0);
  });

  const droguerias = ["Todas", ...Array.from(new Set(stockRecords.map(s => s.drogueria)))];

  const getStockBadgeColor = (estado: string) => {
    if (estado === "Quiebre")     return "bg-black text-white";
    if (estado === "Crítico")     return "bg-destructive text-destructive-foreground";
    if (estado === "Bajo")        return "bg-orange-500 text-white";
    if (estado === "Saludable")   return "bg-emerald-500 text-white";
    if (estado === "Sobre Stock") return "bg-blue-500 text-white";
    return "bg-gray-500 text-white";
  };

  const getRecommendedAction = (estado: string) => {
    if (estado === "Quiebre")     return "Despacho Inmediato Urgente";
    if (estado === "Crítico")     return "Priorizar abastecimiento";
    if (estado === "Bajo")        return "Planificar despacho";
    if (estado === "Sobre Stock") return "Revisar política comercial";
    return "Mantener monitoreo";
  };

  if (!isDataLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 text-center">
        <FileSpreadsheet className="h-16 w-16 text-muted-foreground/40" />
        <div>
          <h2 className="text-xl font-semibold text-foreground">No hay datos cargados</h2>
          <p className="text-muted-foreground mt-2 max-w-sm">
            Usa el botón <strong>Cargar Excel</strong> para importar tus archivos.
          </p>
        </div>
      </div>
    );
  }

  if (stockRecords.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Stock por Droguería</h2>
          <p className="text-muted-foreground">Monitoreo de inventario en canal mayorista.</p>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center border rounded-lg bg-card">
          <p className="text-muted-foreground">
            No se encontraron registros de stock en los archivos cargados.
          </p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Los archivos actuales (precios de droguerías y competencia) no incluyen datos de stock.
            Carga un archivo con columnas: <code>productoAngelus</code>, <code>drogueria</code>, <code>stockActual</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Stock por Droguería</h2>
        <p className="text-muted-foreground">Monitoreo de inventario y alertas de quiebre en canal mayorista.</p>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 rounded-lg shadow-sm border">
        <div className="flex-1 max-w-sm">
          <Input placeholder="Buscar producto..." value={filterProducto} onChange={(e) => setFilterProducto(e.target.value)} />
        </div>
        <div className="w-64">
          <Select value={filterDrogueria} onValueChange={setFilterDrogueria}>
            <SelectTrigger><SelectValue placeholder="Droguería" /></SelectTrigger>
            <SelectContent>
              {droguerias.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto Angelus</TableHead>
              <TableHead>Droguería</TableHead>
              <TableHead className="text-right">Stock Actual</TableHead>
              <TableHead className="text-right">Ventas Promedio</TableHead>
              <TableHead className="text-right">Días Inventario</TableHead>
              <TableHead>Estado Stock</TableHead>
              <TableHead>Acción Recomendada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStock.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.productoAngelus}</TableCell>
                <TableCell>{row.drogueria}</TableCell>
                <TableCell className="text-right font-bold">{row.stockActual}</TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {row.ventasPromedio > 0 ? row.ventasPromedio : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {row.diasInventario > 0 ? `${row.diasInventario} días` : "—"}
                </TableCell>
                <TableCell><Badge className={getStockBadgeColor(row.estadoStock)}>{row.estadoStock}</Badge></TableCell>
                <TableCell className="text-xs font-medium text-primary">{getRecommendedAction(row.estadoStock)}</TableCell>
              </TableRow>
            ))}
            {filteredStock.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Sin registros con los filtros seleccionados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
