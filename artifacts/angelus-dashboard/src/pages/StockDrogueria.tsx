import { useState } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StockDrogueria() {
  const { stockRecords } = useData();
  const [filterDrogueria, setFilterDrogueria] = useState<string>("Todas");
  const [filterProducto, setFilterProducto] = useState("");

  const filteredStock = stockRecords.filter(s => {
    if (filterDrogueria !== "Todas" && s.drogueria !== filterDrogueria) return false;
    if (filterProducto && !s.productoAngelus.toLowerCase().includes(filterProducto.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    // Sort criticals first
    const mapLevel = { "Crítico": 4, "Alto": 3, "Medio": 2, "Normal": 1 } as Record<string, number>;
    return (mapLevel[b.nivelAlerta] || 0) - (mapLevel[a.nivelAlerta] || 0);
  });

  const droguerias = ["Todas", ...Array.from(new Set(stockRecords.map(s => s.drogueria)))];

  const getStockBadgeColor = (estado: string) => {
    switch (estado) {
      case "Quiebre": return "bg-black text-white";
      case "Crítico": return "bg-destructive text-destructive-foreground";
      case "Bajo": return "bg-orange-500 text-white";
      case "Saludable": return "bg-emerald-500 text-white";
      case "Sobre Stock": return "bg-blue-500 text-white";
      default: return "bg-gray-500";
    }
  };

  const getRecommendedAction = (estado: string) => {
    switch (estado) {
      case "Quiebre": return "Despacho Inmediato Urgente";
      case "Crítico": return "Priorizar abastecimiento";
      case "Bajo": return "Planificar despacho";
      case "Sobre Stock": return "Revisar política comercial";
      default: return "Mantener monitoreo";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Stock por Droguería</h2>
        <p className="text-muted-foreground">Monitoreo de inventario y alertas de quiebre en canal mayorista.</p>
      </div>

      <div className="flex gap-4 items-center bg-card p-4 rounded-lg shadow-sm border">
        <div className="flex-1 max-w-sm">
          <Input 
            placeholder="Buscar producto..." 
            value={filterProducto} 
            onChange={(e) => setFilterProducto(e.target.value)}
          />
        </div>
        <div className="w-64">
          <Select value={filterDrogueria} onValueChange={setFilterDrogueria}>
            <SelectTrigger>
              <SelectValue placeholder="Droguería" />
            </SelectTrigger>
            <SelectContent>
              {droguerias.map(d => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
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
              <TableHead className="text-right">Stock Mínimo</TableHead>
              <TableHead className="text-right">Stock Ideal</TableHead>
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
                <TableCell className="text-right text-muted-foreground">{row.stockMinimoEsperado}</TableCell>
                <TableCell className="text-right text-muted-foreground">{row.stockIdeal}</TableCell>
                <TableCell className="text-right">{row.diasInventario} días</TableCell>
                <TableCell>
                  <Badge className={getStockBadgeColor(row.estadoStock)}>
                    {row.estadoStock}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs font-medium text-primary">
                  {getRecommendedAction(row.estadoStock)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}