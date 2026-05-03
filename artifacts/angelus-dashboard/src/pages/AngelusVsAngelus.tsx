import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { generateProductHistory, PRODUCTS, MONTHS } from "@/lib/data";

const LINE_COLORS = ["#1B4F8A", "#00B4B4", "#E11D48", "#F59E0B", "#10B981"];

export default function AngelusVsAngelus() {
  const { angelusPrices } = useData();
  const [filterProduct, setFilterProduct]   = useState("");
  const [filterCanal, setFilterCanal]       = useState<string>("Todos");
  const [chartProduct, setChartProduct]     = useState<string>(PRODUCTS[0].name);
  const [chartCanal, setChartCanal]         = useState<"Droguería" | "Farmacia">("Droguería");

  // ── Table data ───────────────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    let filtered = angelusPrices;
    if (filterProduct) {
      filtered = filtered.filter(p =>
        p.productoAngelus.toLowerCase().includes(filterProduct.toLowerCase())
      );
    }
    if (filterCanal !== "Todos") {
      filtered = filtered.filter(p => p.canal === filterCanal);
    }

    const grouped = filtered.reduce((acc, curr) => {
      const key = `${curr.productoAngelus}-${curr.canal}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(curr);
      return acc;
    }, {} as Record<string, typeof angelusPrices>);

    return Object.entries(grouped).map(([, prices]) => {
      const sorted   = [...prices].sort((a, b) => a.precio - b.precio);
      const minP     = sorted[0];
      const maxP     = sorted[sorted.length - 1];
      const avg      = prices.reduce((a, b) => a + b.precio, 0) / prices.length;
      const mid      = Math.floor(sorted.length / 2);
      const median   = sorted.length % 2 !== 0
        ? sorted[mid].precio
        : (sorted[mid - 1].precio + sorted[mid].precio) / 2;
      const diff     = maxP.precio - minP.precio;
      const varPct   = (diff / minP.precio) * 100;

      let alertLevel = "Verde";
      if (varPct > 35)      alertLevel = "Rojo";
      else if (varPct > 20) alertLevel = "Naranja";
      else if (varPct > 10) alertLevel = "Amarillo";

      return {
        producto:      minP.productoAngelus,
        canal:         minP.canal,
        min:           minP.precio,
        minCliente:    minP.drogueria,
        max:           maxP.precio,
        maxCliente:    maxP.drogueria,
        avg,
        median,
        diff,
        varPct,
        clientesCount: prices.length,
        alertLevel,
      };
    }).sort((a, b) => b.varPct - a.varPct);
  }, [angelusPrices, filterProduct, filterCanal]);

  // ── Farmacia < Droguería alerts ──────────────────────────────────────────────
  const farmaciaMenorDrogAlerts = useMemo(() => {
    const alerts: string[] = [];
    const prods = new Set(angelusPrices.map(p => p.productoAngelus));
    for (const prod of prods) {
      const drog = angelusPrices.filter(p => p.productoAngelus === prod && p.canal === "Droguería");
      const farm = angelusPrices.filter(p => p.productoAngelus === prod && p.canal === "Farmacia");
      if (drog.length && farm.length) {
        if (Math.min(...farm.map(p => p.precio)) < Math.max(...drog.map(p => p.precio))) {
          alerts.push(prod);
        }
      }
    }
    return alerts;
  }, [angelusPrices]);

  // ── Line chart: min / avg / max evolution for selected product ───────────────
  // We use generateProductHistory for Angelus line, plus derive min/max offsets
  const lineData = useMemo(() => {
    const base = generateProductHistory(chartProduct, chartCanal);
    // Derive Min/Max as ±8% of Angelus avg to simulate intra-product variation
    return base.map(point => ({
      mes:      point.mes,
      Mínimo:   Number((point.Angelus * 0.92).toFixed(2)),
      Promedio: point.Angelus,
      Máximo:   Number((point.Angelus * 1.13).toFixed(2)),
    }));
  }, [chartProduct, chartCanal]);

  const yDomain = useMemo(() => {
    const allVals = lineData.flatMap(d => [d.Mínimo, d.Promedio, d.Máximo]);
    const lo = Math.min(...allVals);
    const hi = Math.max(...allVals);
    const pad = (hi - lo) * 0.2;
    return [Math.max(0, lo - pad), hi + pad];
  }, [lineData]);

  const getAlertColor = (level: string) => {
    switch (level) {
      case "Rojo":     return "bg-destructive text-destructive-foreground";
      case "Naranja":  return "bg-orange-500 text-white";
      case "Amarillo": return "bg-yellow-500 text-white";
      default:         return "bg-emerald-500 text-white";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Angelus vs Angelus</h2>
        <p className="text-muted-foreground">Análisis de consistencia de precios internos por canal.</p>
      </div>

      {farmaciaMenorDrogAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ALERTA: Farmacia más barata que Droguería detectada</AlertTitle>
          <AlertDescription>
            Revisar productos: {farmaciaMenorDrogAlerts.join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Line chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Evolución de Precios — Mínimo / Promedio / Máximo</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Eje X: mes · Eje Y: precio USD</p>
            </div>
            <div className="flex gap-2">
              <Select value={chartProduct} onValueChange={setChartProduct} data-testid="select-chart-product">
                <SelectTrigger className="h-8 w-52 text-xs">
                  <SelectValue placeholder="Producto" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCTS.map(p => (
                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={chartCanal} onValueChange={(v) => setChartCanal(v as "Droguería" | "Farmacia")} data-testid="select-chart-canal">
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Droguería">Droguería</SelectItem>
                  <SelectItem value="Farmacia">Farmacia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={lineData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 12, fill: "#6b7280" }}
                axisLine={{ stroke: "#d1d5db" }}
              />
              <YAxis
                domain={yDomain}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                axisLine={{ stroke: "#d1d5db" }}
                width={54}
              />
              <RechartsTooltip
                formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Mínimo"   stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
              <Line type="monotone" dataKey="Promedio" stroke="#1B4F8A" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="Máximo"   stroke="#E11D48" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} strokeDasharray="4 2" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table filters */}
      <div className="flex gap-4 items-center bg-card p-4 rounded-lg shadow-sm border">
        <div className="flex-1 max-w-sm">
          <Input
            placeholder="Buscar producto..."
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            data-testid="input-filter-product"
          />
        </div>
        <div className="w-48">
          <Select value={filterCanal} onValueChange={setFilterCanal} data-testid="select-filter-canal">
            <SelectTrigger>
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Ambos Canales</SelectItem>
              <SelectItem value="Droguería">Droguería</SelectItem>
              <SelectItem value="Farmacia">Farmacia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Precio Mínimo</TableHead>
              <TableHead>Cliente Mín.</TableHead>
              <TableHead>Precio Máximo</TableHead>
              <TableHead>Cliente Máx.</TableHead>
              <TableHead>Promedio</TableHead>
              <TableHead>Variación %</TableHead>
              <TableHead>Alerta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.map((row, idx) => (
              <TableRow key={idx} data-testid={`row-product-${idx}`}>
                <TableCell className="font-medium">{row.producto}</TableCell>
                <TableCell>{row.canal}</TableCell>
                <TableCell>{formatCurrency(row.min)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.minCliente}</TableCell>
                <TableCell>{formatCurrency(row.max)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.maxCliente}</TableCell>
                <TableCell>{formatCurrency(row.avg)}</TableCell>
                <TableCell className="font-medium">{formatPercentage(row.varPct)}</TableCell>
                <TableCell>
                  <Badge className={getAlertColor(row.alertLevel)}>{row.alertLevel}</Badge>
                </TableCell>
              </TableRow>
            ))}
            {tableData.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  No hay datos para mostrar con los filtros seleccionados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
