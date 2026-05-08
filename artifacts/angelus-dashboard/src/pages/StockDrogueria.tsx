import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Package, PackageX, PackageCheck, BarChart3 } from "lucide-react";

export default function StockDrogueria() {
  const { stockRecords, isDataLoaded } = useData();

  const [filterProducto, setFilterProducto] = useState("");
  const [filterEstado,   setFilterEstado]   = useState<"Todos" | "Con Stock" | "Sin Stock">("Todos");

  // ── Summary stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const molecules   = new Set(stockRecords.map(r => r.productoAngelus)).size;
    const conStock    = stockRecords.filter(r => r.stockActual > 0).length;
    const sinStock    = stockRecords.filter(r => r.stockActual === 0).length;
    const totalUnits  = stockRecords.reduce((s, r) => s + r.stockActual, 0);
    return { molecules, conStock, sinStock, totalUnits };
  }, [stockRecords]);

  // ── Filtered + sorted rows ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return stockRecords.filter(r => {
      if (filterProducto && !r.productoAngelus.toLowerCase().includes(filterProducto.toLowerCase())) return false;
      if (filterEstado === "Con Stock"  && r.stockActual === 0)  return false;
      if (filterEstado === "Sin Stock"  && r.stockActual > 0)    return false;
      return true;
    }).sort((a, b) => {
      // Sort by product name, then by INV descending
      const cmp = a.productoAngelus.localeCompare(b.productoAngelus);
      return cmp !== 0 ? cmp : b.stockActual - a.stockActual;
    });
  }, [stockRecords, filterProducto, filterEstado]);

  // ── Empty states ───────────────────────────────────────────────────────────
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
          <h2 className="text-2xl font-bold tracking-tight text-primary">Stock Competidor por Molécula</h2>
          <p className="text-muted-foreground">Inventario de competidores en canal droguería (columna INV).</p>
        </div>
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center border rounded-lg bg-card p-8">
          <Package className="h-10 w-10 text-muted-foreground/40" />
          <p className="text-muted-foreground font-medium">No hay registros de stock.</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            El stock se extrae de la columna <strong>INV</strong> del archivo
            "Mis Productos X Otros Laboratorios". Asegúrate de cargarlo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Stock Competidor por Molécula</h2>
        <p className="text-muted-foreground">
          Inventario de productos competidores en canal droguería — columna <strong>INV</strong> del archivo de competencia.
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <BarChart3 className="h-3.5 w-3.5" /> Moléculas Monitoreadas
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-primary">{stats.molecules}</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <PackageCheck className="h-3.5 w-3.5 text-emerald-600" /> Con Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-emerald-600">{stats.conStock}</p>
            <p className="text-xs text-muted-foreground">presentaciones</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <PackageX className="h-3.5 w-3.5 text-muted-foreground" /> Sin Stock
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-muted-foreground">{stats.sinStock}</p>
            <p className="text-xs text-muted-foreground">presentaciones</p>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Package className="h-3.5 w-3.5 text-blue-600" /> Unidades Totales
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <p className="text-2xl font-bold text-blue-600">{stats.totalUnits.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">inventario competencia</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <div className="flex gap-4 items-center bg-card p-4 rounded-lg shadow-sm border">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Buscar molécula / producto…"
            value={filterProducto}
            onChange={e => setFilterProducto(e.target.value)}
          />
        </div>
        <div className="w-44">
          <Select value={filterEstado} onValueChange={v => setFilterEstado(v as typeof filterEstado)}>
            <SelectTrigger><SelectValue placeholder="Estado" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              <SelectItem value="Con Stock">Con Stock</SelectItem>
              <SelectItem value="Sin Stock">Sin Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground ml-auto">
          {filtered.length} de {stockRecords.length} registros
        </p>
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Molécula / Producto Angelus</TableHead>
              <TableHead>Laboratorio Competidor</TableHead>
              <TableHead>Producto Competidor</TableHead>
              <TableHead className="text-right">INV (unidades)</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(row => (
              <TableRow key={row.id}>
                <TableCell className="font-medium max-w-[200px]">
                  <span className="truncate block" title={row.productoAngelus}>
                    {row.productoAngelus}
                  </span>
                </TableCell>
                <TableCell className="text-sm max-w-[150px]">
                  <span className="truncate block" title={row.drogueria}>
                    {row.drogueria}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                  <span className="truncate block" title={row.productoCompetidor}>
                    {row.productoCompetidor || "—"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className={`font-bold tabular-nums ${row.stockActual > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {row.stockActual > 0 ? row.stockActual.toLocaleString() : "0"}
                  </span>
                </TableCell>
                <TableCell>
                  {row.stockActual > 0 ? (
                    <Badge className="bg-emerald-500 text-white">Con Stock</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Sin Stock</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Sin registros con los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
