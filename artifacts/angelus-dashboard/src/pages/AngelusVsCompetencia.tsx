import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
} from "recharts";
import { generateCompVsCompHistory, PRODUCTS, COMPETITORS } from "@/lib/data";
import { MultiSelect } from "@/components/MultiSelect";

const ALL_PRODUCT_NAMES = PRODUCTS.map(p => p.name);

// Angelus lines: blues/teals; competitor lines: reds/oranges/purples
const ANGELUS_COLORS  = ["#1B4F8A", "#00B4B4", "#10B981", "#6366F1", "#14B8A6"];
const COMP_COLORS     = ["#E11D48", "#F97316", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B"];

export default function AngelusVsCompetencia() {
  const { angelusPrices, competitionPrices } = useData();

  // ── Shared filter ──────────────────────────────────────────────────────────
  const [canal, setCanal] = useState<"Droguería" | "Farmacia">("Droguería");

  // ── Chart multi-selects ────────────────────────────────────────────────────
  const [chartProducts,    setChartProducts]    = useState<string[]>(ALL_PRODUCT_NAMES.slice(0, 3));
  const [chartCompetitors, setChartCompetitors] = useState<string[]>(COMPETITORS.slice(0, 3));

  // ── Table data ─────────────────────────────────────────────────────────────
  const tableData = useMemo(() => {
    const myPrices   = angelusPrices.filter(p => p.canal === canal);
    const compPrices = competitionPrices.filter(p => p.canal === canal);
    const prods      = Array.from(new Set(myPrices.map(p => p.productoAngelus)));

    return prods.map(prod => {
      const myProd   = myPrices.filter(p => p.productoAngelus === prod).sort((a, b) => a.precio - b.precio);
      const compProd = compPrices.filter(p => p.productoAngelusReferencia === prod).sort((a, b) => a.precioCompetidor - b.precioCompetidor);
      if (!myProd.length || !compProd.length) return null;

      const myBest   = myProd[0];
      const compBest = compProd[0];
      const varPct   = ((myBest.precio - compBest.precioCompetidor) / compBest.precioCompetidor) * 100;

      let resultBadge = { label: "", color: "" };
      if (varPct < -3)       resultBadge = { label: "Angelus más competitivo", color: "bg-emerald-500" };
      else if (varPct <= 3)  resultBadge = { label: "Empatado",                color: "bg-blue-500" };
      else if (varPct <= 15) resultBadge = { label: "Competencia más barata",  color: "bg-orange-500" };
      else                   resultBadge = { label: "Alerta Crítica",           color: "bg-destructive text-destructive-foreground" };

      return {
        producto:   prod,
        miPrecio:   myBest.precio,
        miDonde:    myBest.drogueria,
        compNombre: compBest.productoCompetidor,
        compPrecio: compBest.precioCompetidor,
        compDonde:  compBest.cliente,
        varPct,
        resultBadge,
      };
    }).filter(Boolean) as any[];
  }, [angelusPrices, competitionPrices, canal]);

  // ── Line chart data ────────────────────────────────────────────────────────
  const { history: lineHistory, productKeys, competitorKeys } = useMemo(
    () => generateCompVsCompHistory(
      chartProducts.length    ? chartProducts    : [],
      chartCompetitors.length ? chartCompetitors : [],
      canal
    ),
    [chartProducts, chartCompetitors, canal]
  );

  const allKeys = [...productKeys, ...competitorKeys];
  const yDomain = useMemo(() => {
    const allVals = lineHistory
      .flatMap(row => allKeys.map(k => (row[k] as number) ?? 0))
      .filter(v => v > 0);
    if (!allVals.length) return [0, 50];
    const lo  = Math.min(...allVals);
    const hi  = Math.max(...allVals);
    const pad = Math.max((hi - lo) * 0.18, 1);
    return [Math.max(0, lo - pad), hi + pad];
  }, [lineHistory, allKeys]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Angelus vs Competencia</h2>
          <p className="text-muted-foreground">Comparativa de precios Angelus contra líderes del mercado.</p>
        </div>
        {/* Shared canal toggle — controls table + chart */}
        <ToggleGroup
          type="single"
          value={canal}
          onValueChange={(v) => v && setCanal(v as "Droguería" | "Farmacia")}
        >
          <ToggleGroupItem value="Droguería" className="px-6">Droguerías</ToggleGroupItem>
          <ToggleGroupItem value="Farmacia"  className="px-6">Farmacias</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* ── Table ── */}
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto Angelus</TableHead>
              <TableHead>Mi Mejor Precio</TableHead>
              <TableHead>Dónde soy más barato</TableHead>
              <TableHead>Competidor Mínimo</TableHead>
              <TableHead>Precio Competidor</TableHead>
              <TableHead>Dónde (Comp)</TableHead>
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
                <TableCell>{row.compNombre}</TableCell>
                <TableCell className="font-bold text-muted-foreground">{formatCurrency(row.compPrecio)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.compDonde}</TableCell>
                <TableCell className={`font-medium ${row.varPct > 0 ? "text-destructive" : "text-emerald-600"}`}>
                  {row.varPct > 0 ? "+" : ""}{formatPercentage(row.varPct)}
                </TableCell>
                <TableCell>
                  <Badge className={row.resultBadge.color}>{row.resultBadge.label}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Separator />

      {/* ── Line chart ── */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">Evolución de Precios — Angelus vs Competidores</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Canal: <strong>{canal}</strong> · Eje X: mes · Eje Y: precio USD ·
                <span className="text-primary font-medium"> Azul = Angelus</span> ·
                <span className="text-destructive font-medium"> Rojo = Competencia</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <MultiSelect
                options={ALL_PRODUCT_NAMES}
                selected={chartProducts}
                onChange={setChartProducts}
                placeholder="Productos Angelus..."
              />
              <MultiSelect
                options={COMPETITORS}
                selected={chartCompetitors}
                onChange={setChartCompetitors}
                placeholder="Competidores..."
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-[340px]">
          {allKeys.length === 0 ? (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Selecciona al menos un producto o competidor para ver el gráfico
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

                {/* Angelus product lines — blue palette */}
                {productKeys.map((prod, i) => (
                  <Line
                    key={`angelus-${prod}`}
                    type="monotone"
                    dataKey={prod}
                    name={prod}
                    stroke={ANGELUS_COLORS[i % ANGELUS_COLORS.length]}
                    strokeWidth={2.5}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}

                {/* Competitor lines — red/orange palette, dashed */}
                {competitorKeys.map((comp, i) => (
                  <Line
                    key={`comp-${comp}`}
                    type="monotone"
                    dataKey={comp}
                    name={comp}
                    stroke={COMP_COLORS[i % COMP_COLORS.length]}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
