import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";
import { generateStockHistory, PRODUCTS, DROGUERIAS } from "@/lib/data";

const ALL_PRODUCT_NAMES = PRODUCTS.map(p => p.name);

export default function StockDrogueria() {
  const { stockRecords } = useData();

  // Table filters
  const [filterDrogueria, setFilterDrogueria] = useState<string>("Todas");
  const [filterProducto,  setFilterProducto]  = useState("");

  // Chart selectors
  const [chartProduct,  setChartProduct]  = useState<string>(ALL_PRODUCT_NAMES[0]);
  const [chartDrogueria, setChartDrogueria] = useState<string>(DROGUERIAS[0]);

  const filteredStock = stockRecords.filter(s => {
    if (filterDrogueria !== "Todas" && s.drogueria !== filterDrogueria) return false;
    if (filterProducto && !s.productoAngelus.toLowerCase().includes(filterProducto.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    const mapLevel: Record<string, number> = { "Crítico": 4, "Alto": 3, "Medio": 2, "Normal": 1 };
    return (mapLevel[b.nivelAlerta] || 0) - (mapLevel[a.nivelAlerta] || 0);
  });

  const droguerias = ["Todas", ...Array.from(new Set(stockRecords.map(s => s.drogueria)))];

  const getStockBadgeColor = (estado: string) => {
    if (estado === "Quiebre")    return "bg-black text-white";
    if (estado === "Crítico")    return "bg-destructive text-destructive-foreground";
    if (estado === "Bajo")       return "bg-orange-500 text-white";
    if (estado === "Saludable")  return "bg-emerald-500 text-white";
    if (estado === "Sobre Stock") return "bg-blue-500 text-white";
    return "bg-gray-500";
  };

  const getRecommendedAction = (estado: string) => {
    if (estado === "Quiebre")    return "Despacho Inmediato Urgente";
    if (estado === "Crítico")    return "Priorizar abastecimiento";
    if (estado === "Bajo")       return "Planificar despacho";
    if (estado === "Sobre Stock") return "Revisar política comercial";
    return "Mantener monitoreo";
  };

  // Stock history line chart
  const stockHistory = useMemo(
    () => generateStockHistory(chartProduct, chartDrogueria),
    [chartProduct, chartDrogueria]
  );

  const stockYDomain = useMemo(() => {
    const vals = stockHistory.flatMap(r => [r.stockActual, r.stockMinimo, r.stockIdeal]);
    const hi = Math.max(...vals);
    return [0, hi * 1.15];
  }, [stockHistory]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Stock por Droguería</h2>
        <p className="text-muted-foreground">Monitoreo de inventario y alertas de quiebre en canal mayorista.</p>
      </div>

      {/* Table filters */}
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

      {/* Table */}
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
                <TableCell><Badge className={getStockBadgeColor(row.estadoStock)}>{row.estadoStock}</Badge></TableCell>
                <TableCell className="text-xs font-medium text-primary">{getRecommendedAction(row.estadoStock)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Separator />

      {/* Stock history line chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Histórico de Stock — Evolución Mensual</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Eje X: mes · Eje Y: unidades en stock ·
            <span className="text-[#1B4F8A] font-semibold"> Azul = Stock Actual</span> ·
            <span className="text-destructive font-semibold"> Rojo = Mínimo</span> ·
            <span className="text-emerald-600 font-semibold"> Verde = Ideal</span>
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Producto:</span>
              <Select value={chartProduct} onValueChange={setChartProduct}>
                <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_PRODUCT_NAMES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Droguería:</span>
              <Select value={chartDrogueria} onValueChange={setChartDrogueria}>
                <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DROGUERIAS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stockHistory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6b7280" }} />
              <YAxis
                domain={stockYDomain}
                tickFormatter={(v) => String(Math.round(v))}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                width={50}
                label={{ value: "Unidades", angle: -90, position: "insideLeft", offset: -5, fontSize: 11, fill: "#9ca3af" }}
              />
              <RechartsTooltip
                formatter={(v: number, n: string) => [Math.round(v), n]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {/* Reference bands — rendered as dashed lines */}
              <Line type="monotone" dataKey="stockActual" name="Stock Actual" stroke="#1B4F8A" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="stockMinimo" name="Stock Mínimo" stroke="#E11D48" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              <Line type="monotone" dataKey="stockIdeal"  name="Stock Ideal"  stroke="#10B981" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
