import { useMemo, useState } from "react";
import { useData } from "@/context/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { AlertCircle, DollarSign, Package, TrendingDown, TrendingUp } from "lucide-react";
import { generateProductVsCompetitors, PRODUCTS, COMPETITORS } from "@/lib/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/MultiSelect";
import { Separator } from "@/components/ui/separator";

const ALL_PRODUCT_NAMES = PRODUCTS.map(p => p.name);

// Angelus = corporate blue; competitors = warm palette, dashed
const COMP_COLORS = ["#E11D48", "#F97316", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B"];

const ALERT_COLORS: Record<string, string> = {
  "Crítico": "#E11D48",
  "Alto":    "#F97316",
  "Medio":   "#FBBF24",
  "Normal":  "#10B981",
};

export default function Dashboard() {
  const { angelusPrices, competitionPrices, stockRecords } = useData();

  // ── Shared filters ────────────────────────────────────────────────────────
  const [canal,           setCanal]           = useState<"Droguería" | "Farmacia">("Droguería");
  const [chartProduct,    setChartProduct]    = useState<string>(ALL_PRODUCT_NAMES[0]);
  const [chartCompetitors, setChartCompetitors] = useState<string[]>(COMPETITORS.slice(0, 3));

  // ── KPI calculations ──────────────────────────────────────────────────────
  const drogueriaPrices = angelusPrices.filter(p => p.canal === "Droguería");
  const farmaciaPrices  = angelusPrices.filter(p => p.canal === "Farmacia");
  const canalPrices     = canal === "Droguería" ? drogueriaPrices : farmaciaPrices;

  const totalProductos = new Set(angelusPrices.map(p => p.productoAngelus)).size;
  const totalPuntos    = angelusPrices.length;
  const avgCanal       = canalPrices.length
    ? canalPrices.reduce((a, b) => a + b.precio, 0) / canalPrices.length : 0;
  const avgDrogueria   = drogueriaPrices.length
    ? drogueriaPrices.reduce((a, b) => a + b.precio, 0) / drogueriaPrices.length : 0;
  const avgFarmacia    = farmaciaPrices.length
    ? farmaciaPrices.reduce((a, b) => a + b.precio, 0) / farmaciaPrices.length : 0;

  let alertasCriticas         = 0;
  let masBaratoQueCompetencia = 0;
  const brechasRiesgosas      = new Set<string>();
  const productos             = Array.from(new Set(angelusPrices.map(p => p.productoAngelus)));

  productos.forEach(prod => {
    const prices   = angelusPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    const min      = Math.min(...prices);
    const max      = Math.max(...prices);
    const variation = prices.length > 1 ? ((max - min) / min) * 100 : 0;
    if (variation > 35) alertasCriticas++;

    const prodDrog = drogueriaPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    const prodFarm = farmaciaPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    if (prodDrog.length && prodFarm.length) {
      if (Math.min(...prodFarm) < Math.max(...prodDrog)) brechasRiesgosas.add(prod);
    }
    const compPrices = competitionPrices
      .filter(p => p.productoAngelusReferencia === prod).map(p => p.precioCompetidor);
    if (compPrices.length && min < Math.min(...compPrices)) masBaratoQueCompetencia++;
  });

  const quiebresStock = stockRecords.filter(
    s => s.estadoStock === "Quiebre" || s.estadoStock === "Crítico"
  ).length;
  alertasCriticas += quiebresStock;

  const alertDistribution = [
    { name: "Crítico", value: alertasCriticas },
    { name: "Alto",    value: Math.max(1, Math.floor(totalProductos * 0.3)) },
    { name: "Medio",   value: Math.max(1, Math.floor(totalProductos * 0.4)) },
    { name: "Normal",  value: Math.max(1, Math.floor(totalProductos * 0.8)) },
  ];

  // ── Line chart: Angelus vs competitors for selected product ───────────────
  const lineHistory = useMemo(
    () => generateProductVsCompetitors(chartProduct, chartCompetitors, canal),
    [chartProduct, chartCompetitors, canal]
  );

  const allLineKeys = ["Angelus", ...chartCompetitors];
  const yDomain = useMemo(() => {
    const allVals = lineHistory
      .flatMap(row => allLineKeys.map(k => (row[k] as number) ?? 0))
      .filter(v => v > 0);
    if (!allVals.length) return [0, 50];
    const lo = Math.min(...allVals);
    const hi = Math.max(...allVals);
    const pad = Math.max((hi - lo) * 0.2, 1);
    return [Math.max(0, lo - pad), hi + pad];
  }, [lineHistory, allLineKeys]);

  return (
    <div className="space-y-6">
      {/* Header + shared filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Resumen Ejecutivo</h2>
          <p className="text-muted-foreground">Visión general del mercado y precios de Angelus.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Canal:</span>
          <Select value={canal} onValueChange={(v) => setCanal(v as "Droguería" | "Farmacia")}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Droguería">Droguería</SelectItem>
              <SelectItem value="Farmacia">Farmacia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Analizados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalProductos}</div>
            <p className="text-xs text-muted-foreground">En {totalPuntos} puntos de venta</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-destructive/20 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Alertas Críticas</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{alertasCriticas}</div>
            <p className="text-xs text-destructive/80">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Promedio — {canal}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgCanal)}</div>
            <p className="text-xs text-muted-foreground">
              Drog: {formatCurrency(avgDrogueria)} · Farm: {formatCurrency(avgFarmacia)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Líder en Precio vs Comp.</CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{masBaratoQueCompetencia}</div>
            <p className="text-xs text-muted-foreground">Productos más baratos que competencia</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brechas Riesgosas</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{brechasRiesgosas.size}</div>
            <p className="text-xs text-muted-foreground">Farmacia más barata que Droguería</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Quiebre Stock</CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{quiebresStock}</div>
            <p className="text-xs text-muted-foreground">Droguerías en quiebre o crítico</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* ── Charts ── */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* LINE CHART — mi producto vs competidores */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Mi Producto vs Competencia</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Canal: <strong>{canal}</strong> · Eje X: mes · Eje Y: precio USD ·
                  <span className="text-[#1B4F8A] font-semibold"> Azul = Angelus</span>
                </p>
              </div>
            </div>
            {/* Selectors below title */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Select value={chartProduct} onValueChange={setChartProduct}>
                <SelectTrigger className="h-8 w-52 text-xs">
                  <SelectValue placeholder="Producto..." />
                </SelectTrigger>
                <SelectContent>
                  {ALL_PRODUCT_NAMES.map(p => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <MultiSelect
                options={COMPETITORS}
                selected={chartCompetitors}
                onChange={setChartCompetitors}
                placeholder="Competidores..."
                className="h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
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
                {/* Angelus — solid blue, thicker */}
                <Line
                  type="monotone"
                  dataKey="Angelus"
                  stroke="#1B4F8A"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                {/* Competitors — dashed, warm palette */}
                {chartCompetitors.map((comp, i) => (
                  <Line
                    key={comp}
                    type="monotone"
                    dataKey={comp}
                    stroke={COMP_COLORS[i % COMP_COLORS.length]}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* PIE CHART */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Distribución de Alertas por Nivel</CardTitle>
          </CardHeader>
          <CardContent className="h-[360px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={115}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {alertDistribution.map((entry, index) => (
                    <Cell key={index} fill={ALERT_COLORS[entry.name] ?? "#94a3b8"} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
