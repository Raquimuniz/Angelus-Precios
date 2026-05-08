import { useState, useMemo, useEffect } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { AlertCircle, FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from "recharts";

export default function AngelusVsAngelus() {
  const { angelusPrices, competitionPrices, productNames, isDataLoaded } = useData();

  const [filterText,  setFilterText]  = useState("");
  const [filterCanal, setFilterCanal] = useState<string>("Todos");
  const [chartProduct, setChartProduct] = useState<string>("");

  useEffect(() => {
    if (productNames.length) setChartProduct(p => p && productNames.includes(p) ? p : productNames[0]);
  }, [productNames]);

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

  // Real bar data: Angelus prices per droguería for the selected product
  const barData = useMemo(() => {
    if (!chartProduct) return [];
    return angelusPrices
      .filter(p => p.productoAngelus === chartProduct && p.canal === effectiveCanal)
      .sort((a, b) => a.precio - b.precio)
      .map(p => ({ drogueria: p.drogueria, precio: p.precio }));
  }, [angelusPrices, chartProduct, effectiveCanal]);

  const minBar = barData.length ? barData[0].precio : 0;
  const maxBar = barData.length ? barData[barData.length - 1].precio : 0;

  const getAlertColor = (level: string) => {
    if (level === "Rojo")     return "bg-destructive text-destructive-foreground";
    if (level === "Naranja")  return "bg-orange-500 text-white";
    if (level === "Amarillo") return "bg-yellow-500 text-white";
    return "bg-emerald-500 text-white";
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Angelus vs Angelus</h2>
        <p className="text-muted-foreground">Consistencia interna de precios por droguería y canal.</p>
      </div>

      {farmaciaMenorDrogAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ALERTA: Farmacia más barata que Droguería</AlertTitle>
          <AlertDescription>
            Revisar: {farmaciaMenorDrogAlerts.slice(0, 5).join(", ")}
            {farmaciaMenorDrogAlerts.length > 5 ? ` y ${farmaciaMenorDrogAlerts.length - 5} más` : ""}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-3 items-center bg-card p-4 rounded-lg shadow-sm border">
        <div className="flex-1 min-w-[160px] max-w-sm">
          <Input placeholder="Buscar producto..." value={filterText} onChange={(e) => setFilterText(e.target.value)} />
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
        <p className="text-xs text-muted-foreground">Gráfico: canal <strong>{effectiveCanal}</strong></p>
      </div>

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
              <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Sin datos con los filtros seleccionados</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Separator />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Precios por Droguería — Snapshot Actual</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Canal: <strong>{effectiveCanal}</strong> · Ordenado de menor a mayor ·
            <span className="text-emerald-600 font-semibold"> Verde = mínimo</span> ·
            <span className="text-destructive font-semibold"> Rojo = máximo</span>
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs text-muted-foreground font-medium">Producto:</span>
            <Select value={chartProduct} onValueChange={setChartProduct}>
              <SelectTrigger className="h-8 w-64 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {productNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="h-[300px]">
          {barData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              Sin datos para este producto en {effectiveCanal}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="drogueria" tick={{ fontSize: 10, fill: "#6b7280" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tickFormatter={(v) => `$${Number(v).toFixed(0)}`} tick={{ fontSize: 11, fill: "#6b7280" }} width={54} />
                <RechartsTooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Precio"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="precio" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.precio === minBar ? "#10B981" : entry.precio === maxBar ? "#E11D48" : "#1B4F8A"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
