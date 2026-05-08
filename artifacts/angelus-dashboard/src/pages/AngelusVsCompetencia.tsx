import { useState, useMemo, useEffect } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { FileSpreadsheet } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
} from "recharts";

const COMP_COLORS = ["#E11D48", "#F97316", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B"];

export default function AngelusVsCompetencia() {
  const { angelusPrices, competitionPrices, productNames, isDataLoaded } = useData();

  const [canal, setCanal] = useState<"Droguería" | "Farmacia">("Droguería");
  const [chartProduct,    setChartProduct]    = useState<string>("");
  const [chartCompetitor, setChartCompetitor] = useState<string>("");

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

  useEffect(() => {
    setChartCompetitor(productCompetitors[0] ?? "");
  }, [productCompetitors]);

  const tableData = useMemo(() => {
    const myPrices   = angelusPrices.filter(p => p.canal === canal);
    const compPrices = competitionPrices.filter(p => p.canal === canal);
    const prods      = Array.from(new Set(myPrices.map(p => p.productoAngelus)));

    return prods.map(prod => {
      const myProd   = myPrices.filter(p => p.productoAngelus === prod).sort((a, b) => a.precio - b.precio);
      const compProd = compPrices.filter(p => p.productoAngelusReferencia === prod).sort((a, b) => a.precioCompetidor - b.precioCompetidor);
      if (!myProd.length || !compProd.length) return null;

      const myBest = myProd[0], compBest = compProd[0];
      const varPct = ((myBest.precio - compBest.precioCompetidor) / compBest.precioCompetidor) * 100;

      let resultBadge = { label: "", color: "" };
      if (varPct < -3)       resultBadge = { label: "Angelus más competitivo", color: "bg-emerald-500" };
      else if (varPct <= 3)  resultBadge = { label: "Empatado",                color: "bg-blue-500" };
      else if (varPct <= 15) resultBadge = { label: "Competencia más barata",  color: "bg-orange-500" };
      else                   resultBadge = { label: "Alerta Crítica",           color: "bg-destructive text-destructive-foreground" };

      return {
        producto: prod, miPrecio: myBest.precio, miDonde: myBest.drogueria,
        compNombre: compBest.productoCompetidor, compPrecio: compBest.precioCompetidor,
        compDonde: compBest.cliente, compLab: compBest.laboratorioCompetidor,
        varPct, resultBadge,
      };
    }).filter(Boolean) as any[];
  }, [angelusPrices, competitionPrices, canal]);

  // Bar chart: Angelus min + all records of selected competitor for the product
  const barData = useMemo(() => {
    if (!chartProduct) return [];
    const myPrices = angelusPrices.filter(p => p.productoAngelus === chartProduct && p.canal === canal);
    if (!myPrices.length) return [];
    const myMin = Math.min(...myPrices.map(p => p.precio));
    const bars: { name: string; precio: number; type: string }[] = [
      { name: "Angelus (mín)", precio: myMin, type: "angelus" },
    ];
    if (chartCompetitor) {
      const cp = competitionPrices.filter(p =>
        p.productoAngelusReferencia === chartProduct &&
        p.canal === canal &&
        p.laboratorioCompetidor === chartCompetitor
      );
      cp.forEach((r, i) => {
        bars.push({ name: r.productoCompetidor || `${chartCompetitor} ${i + 1}`, precio: r.precioCompetidor, type: "comp" });
      });
    }
    return bars.sort((a, b) => a.precio - b.precio);
  }, [angelusPrices, competitionPrices, chartProduct, chartCompetitor, canal]);

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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Angelus vs Competencia</h2>
          <p className="text-muted-foreground">Comparativa de precios actuales contra el mercado.</p>
        </div>
        <ToggleGroup type="single" value={canal} onValueChange={(v) => v && setCanal(v as "Droguería" | "Farmacia")}>
          <ToggleGroupItem value="Droguería" className="px-6">Droguerías</ToggleGroupItem>
          <ToggleGroupItem value="Farmacia"  className="px-6">Farmacias</ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto Angelus</TableHead>
              <TableHead>Mi Mejor Precio</TableHead>
              <TableHead>Dónde</TableHead>
              <TableHead>Competidor Mínimo</TableHead>
              <TableHead>Laboratorio</TableHead>
              <TableHead>Precio Comp.</TableHead>
              <TableHead>Brecha %</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tableData.sort((a: any, b: any) => b.varPct - a.varPct).map((row: any, idx: number) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{row.producto}</TableCell>
                <TableCell className="font-bold text-primary">{formatCurrency(row.miPrecio)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.miDonde}</TableCell>
                <TableCell className="text-xs">{row.compNombre}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.compLab}</TableCell>
                <TableCell className="font-bold">{formatCurrency(row.compPrecio)}</TableCell>
                <TableCell className={`font-medium ${row.varPct > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {row.varPct > 0 ? "+" : ""}{formatPercentage(row.varPct)}
                </TableCell>
                <TableCell><Badge className={row.resultBadge.color}>{row.resultBadge.label}</Badge></TableCell>
              </TableRow>
            ))}
            {tableData.length === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin datos de competencia para el canal seleccionado</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Separator />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Angelus vs Competidor — Precios Actuales</CardTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Canal: <strong>{canal}</strong> ·
            <span className="text-[#1B4F8A] font-semibold"> Azul = Angelus mín.</span> ·
            <span className="text-destructive font-semibold"> Rojo = productos competidor</span>
          </p>
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Producto:</span>
              <Select value={chartProduct} onValueChange={setChartProduct}>
                <SelectTrigger className="h-8 w-52 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {productNames.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium">Competidor:</span>
              <Select value={chartCompetitor} onValueChange={setChartCompetitor}>
                <SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {productCompetitors.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[300px]">
          {barData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
              {chartProduct ? "Sin datos para este producto/canal/competidor" : "Selecciona un producto"}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 5, right: 20, left: 10, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#6b7280" }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tickFormatter={(v) => `$${Number(v).toFixed(0)}`} tick={{ fontSize: 11, fill: "#6b7280" }} width={54} />
                <RechartsTooltip formatter={(v: number) => [`$${v.toFixed(2)}`, "Precio"]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="precio" radius={[4, 4, 0, 0]}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.type === "angelus" ? "#1B4F8A" : COMP_COLORS[i % COMP_COLORS.length]} />
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
