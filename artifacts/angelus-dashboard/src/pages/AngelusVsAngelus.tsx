import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { generatePriceHistory, PRODUCTS } from "@/lib/data";
import { MultiSelect } from "@/components/MultiSelect";

const ALL_PRODUCT_NAMES = PRODUCTS.map(p => p.name);

const LINE_COLORS = [
  "#1B4F8A", "#00B4B4", "#10B981", "#F59E0B", "#E11D48",
  "#6366F1", "#F97316", "#8B5CF6", "#EC4899", "#14B8A6",
];

export default function AngelusVsAngelus() {
  const { angelusPrices } = useData();

  // ── Shared filters (control both table AND chart) ─────────────────────────
  const [filterProduct, setFilterProduct] = useState("");
  const [filterCanal, setFilterCanal]     = useState<string>("Todos");

  // ── Chart-specific: multi-select which products to show as lines ───────────
  const [chartProducts, setChartProducts] = useState<string[]>(ALL_PRODUCT_NAMES.slice(0, 5));

  // ── Table data ─────────────────────────────────────────────────────────────
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
      const diff     = maxP.precio - minP.precio;
      const varPct   = (diff / minP.precio) * 100;

      let alertLevel = "Verde";
      if (varPct > 35)      alertLevel = "Rojo";
      else if (varPct > 20) alertLevel = "Naranja";
      else if (varPct > 10) alertLevel = "Amarillo";

      return {
        producto:   minP.productoAngelus,
        canal:      minP.canal,
        min:        minP.precio,
        minCliente: minP.drogueria,
        max:        maxP.precio,
        maxCliente: maxP.drogueria,
        avg,
        varPct,
        alertLevel,
      };
    }).sort((a, b) => b.varPct - a.varPct);
  }, [angelusPrices, filterProduct, filterCanal]);

  // ── Farmacia < Droguería alerts ────────────────────────────────────────────
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

  // ── Line chart: multi-product price evolution, same canal filter ───────────
  const effectiveCanal = filterCanal === "Todos" ? "Droguería" : filterCanal as "Droguería" | "Farmacia";

  const lineHistory = useMemo(
    () => generatePriceHistory(
      chartProducts.length ? chartProducts : ["Amoxicilina 500mg"],
      effectiveCanal
    ),
    [chartProducts, effectiveCanal]
  );

  const yDomain = useMemo(() => {
    const allVals = lineHistory
      .flatMap(row => chartProducts.map(p => (row[p] as number) ?? 0))
      .filter(v => v > 0);
    if (!allVals.length) return [0, 50];
    const lo  = Math.min(...allVals);
    const hi  = Math.max(...allVals);
    const pad = Math.max((hi - lo) * 0.18, 1);
    return [Math.max(0, lo - pad), hi + pad];
  }, [lineHistory, chartProducts]);

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
            Revisar: {farmaciaMenorDrogAlerts.join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* ── Shared filters (affect table + chart canal) ── */}
      <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg shadow-sm border">
        <div className="flex-1 min-w-[160px] max-w-sm">
          <Input
            placeholder="Buscar producto en tabla..."
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
          />
        </div>
        <div className="w-48">
          <Select value={filterCanal} onValueChange={setFilterCanal}>
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
        <p className="text-xs text-muted-foreground">
          Filtros aplicados a tabla y gráfico
        </p>
      </div>

      {/* ── Line chart ── */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Evolución de Precios — Multi-Producto</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Canal: <strong>{effectiveCanal}</strong> · Eje X: mes · Eje Y: precio USD
              </p>
            </div>
            <MultiSelect
              options={ALL_PRODUCT_NAMES}
              selected={chartProducts}
              onChange={setChartProducts}
              placeholder="Seleccionar productos..."
            />
          </div>
        </CardHeader>
        <CardContent className="h-[320px]">
          {chartProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Selecciona al menos un producto para ver el gráfico
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineHistory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={{ stroke: "#d1d5db" }} />
                <YAxis
                  domain={yDomain}
                  tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  axisLine={{ stroke: "#d1d5db" }}
                  width={54}
                />
                <RechartsTooltip
                  formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {chartProducts.map((prod, i) => (
                  <Line
                    key={prod}
                    type="monotone"
                    dataKey={prod}
                    stroke={LINE_COLORS[i % LINE_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Separator />

      {/* ── Table ── */}
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
              <TableRow key={idx}>
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
                  No hay datos con los filtros seleccionados
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
