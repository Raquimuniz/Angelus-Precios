import { useState, useMemo, useEffect } from "react";
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
import { generateProductVsCompetitors } from "@/lib/data";
import { MultiSelect } from "@/components/MultiSelect";

const COMP_COLORS = ["#E11D48", "#F97316", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B"];

export default function AngelusVsAngelus() {
  const { angelusPrices, competitionPrices, productNames } = useData();

  const [filterText,  setFilterText]  = useState("");
  const [filterCanal, setFilterCanal] = useState<string>("Todos");

  // Chart selectors
  const [chartProduct,     setChartProduct]     = useState<string>("");
  const [chartCompetitors, setChartCompetitors] = useState<string[]>([]);

  // Sync with loaded data
  useEffect(() => {
    if (productNames.length) setChartProduct(p => p && productNames.includes(p) ? p : productNames[0]);
  }, [productNames]);

  // Competitors available for the selected product only
  const productCompetitors = useMemo(() =>
    Array.from(new Set(
      competitionPrices
        .filter(p => p.productoAngelusReferencia === chartProduct)
        .map(p => p.laboratorioCompetidor)
        .filter(Boolean)
    )).sort(),
    [competitionPrices, chartProduct]
  );

  // Reset selection when product changes
  useEffect(() => {
    setChartCompetitors(productCompetitors.slice(0, 3));
  }, [productCompetitors]);

  const tableData = useMemo(() => {
    let filtered = angelusPrices;
    if (filterText)              filtered = filtered.filter(p => p.productoAngelus.toLowerCase().includes(filterText.toLowerCase()));
    if (filterCanal !== "Todos") filtered = filtered.filter(p => p.canal === filterCanal);

    const grouped = filtered.reduce((acc, curr) => {
      const key = `${curr.productoAngelus}-${curr.canal}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(curr);
      return acc;
    }, {} as Record<string, typeof angelusPrices>);

    return Object.entries(grouped).map(([, prices]) => {
      const sorted = [...prices].sort((a, b) => a.precio - b.precio);
      const min = sorted[0], max = sorted[sorted.length - 1];
      const avg = prices.reduce((a, b) => a + b.precio, 0) / prices.length;
      const varPct = ((max.precio - min.precio) / min.precio) * 100;
      let alertLevel = "Verde";
      if (varPct > 35) alertLevel = "Rojo";
      else if (varPct > 20) alertLevel = "Naranja";
      else if (varPct > 10) alertLevel = "Amarillo";
      return { producto: min.productoAngelus, canal: min.canal, min: min.precio, minCliente: min.drogueria, max: max.precio, maxCliente: max.drogueria, avg, varPct, alertLevel };
    }).sort((a, b) => b.varPct - a.varPct);
  }, [angelusPrices, filterText, filterCanal]);

  const farmaciaMenorDrogAlerts = useMemo(() => {
    const alerts: string[] = [];
    for (const prod of productNames) {
      const drog = angelusPrices.filter(p => p.productoAngelus === prod && p.canal === "Droguería");
      const farm = angelusPrices.filter(p => p.productoAngelus === prod && p.canal === "Farmacia");
      if (drog.length && farm.length && Math.min(...farm.map(p => p.precio)) < Math.max(...drog.map(p => p.precio)))
        alerts.push(prod);
    }
    return alerts;
  }, [angelusPrices, productNames]);

  const effectiveCanal = filterCanal === "Todos" ? "Droguería" : filterCanal as "Droguería" | "Farmacia";

  const lineHistory = useMemo(
    () => chartProduct && chartCompetitors.length
      ? generateProductVsCompetitors(chartProduct, chartCompetitors, effectiveCanal)
      : [],
    [chartProduct, chartCompetitors, effectiveCanal]
  );

  const allLineKeys = ["Angelus", ...chartCompetitors];
  const yDomain = useMemo(() => {
    const vals = lineHistory.flatMap(r => allLineKeys.map(k => (r[k] as number) ?? 0)).filter(v => v > 0);
    if (!vals.length) return [0, 50];
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = Math.max((hi - lo) * 0.2, 1);
    return [Math.max(0, lo - pad), hi + pad];
  }, [lineHistory, allLineKeys]);

  const getAlertColor = (level: string) => {
    if (level === "Rojo")     return "bg-destructive text-destructive-foreground";
    if (level === "Naranja")  return "bg-orange-500 text-white";
    if (level === "Amarillo") return "bg-yellow-500 text-white";
    return "bg-emerald-500 text-white";
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Angelus vs Angelus</h2>
        <p className="text-muted-foreground">Consistencia interna de precios — mi producto vs competencia.</p>
      </div>

      {farmaciaMenorDrogAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ALERTA: Farmacia más barata que Droguería</AlertTitle>
          <AlertDescription>Revisar: {farmaciaMenorDrogAlerts.slice(0, 5).join(", ")}{farmaciaMenorDrogAlerts.length > 5 ? ` y ${farmaciaMenorDrogAlerts.length - 5} más` : ""}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg shadow-sm border">
        <div className="flex-1 min-w-[160px] max-w-sm">
          <Input placeholder="Buscar producto en tabla..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />
        </div>
        <div className="w-48">
          <Select value={filterCanal} onValueChange={setFilterCanal}>
            <SelectTrigger><SelectValue placeholder="Canal" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Ambos Canales</SelectItem>
              <SelectItem value="Droguería">Droguería</SelectItem>
              <SelectItem value="Farmacia">Farmacia</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">Canal del gráfico: <strong>{effectiveCanal}</strong></p>
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
              <TableRow key={idx}>
                <TableCell className="font-medium">{row.producto}</TableCell>
                <TableCell>{row.canal}</TableCell>
                <TableCell>{formatCurrency(row.min)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.minCliente}</TableCell>
                <TableCell>{formatCurrency(row.max)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.maxCliente}</TableCell>
                <TableCell>{formatCurrency(row.avg)}</TableCell>
                <TableCell className="font-medium">{formatPercentage(row.varPct)}</TableCell>
                <TableCell><Badge className={getAlertColor(row.alertLevel)}>{row.alertLevel}</Badge></TableCell>
              </TableRow>
            ))}
            {tableData.length === 0 && (
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No hay datos con los filtros seleccionados</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Separator />

      {/* Chart */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Mi Producto vs Competencia — Evolución de Precios</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Canal: <strong>{effectiveCanal}</strong> · <span className="text-[#1B4F8A] font-semibold">Azul sólido = Angelus</span> · <span className="text-destructive font-semibold">Punteado = Competidores</span>
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <Select value={chartProduct} onValueChange={setChartProduct}>
              <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="Producto..." /></SelectTrigger>
              <SelectContent>
                {productNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
            <MultiSelect
              options={productCompetitors}
              selected={chartCompetitors}
              onChange={setChartCompetitors}
              placeholder="Competidores..."
              className="h-8 text-xs"
            />
          </div>
        </CardHeader>
        <CardContent className="h-[300px]">
          {lineHistory.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Selecciona un producto y competidores
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineHistory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: "#6b7280" }} />
                <YAxis domain={yDomain} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} tick={{ fontSize: 11, fill: "#6b7280" }} width={54} />
                <RechartsTooltip formatter={(v: number, n: string) => [`$${v.toFixed(2)}`, n]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Angelus" stroke="#1B4F8A" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                {chartCompetitors.map((comp, i) => (
                  <Line key={comp} type="monotone" dataKey={comp}
                    stroke={COMP_COLORS[i % COMP_COLORS.length]} strokeWidth={2}
                    strokeDasharray="5 3" dot={{ r: 3 }} activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
