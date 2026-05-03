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
import { generatePriceHistory, PRODUCTS } from "@/lib/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const LINE_COLORS = ["#1B4F8A", "#00B4B4", "#F59E0B", "#E11D48", "#10B981"];

const ALERT_COLORS: Record<string, string> = {
  "Crítico": "#E11D48",
  "Alto":    "#F97316",
  "Medio":   "#FBBF24",
  "Normal":  "#10B981",
};

export default function Dashboard() {
  const { angelusPrices, competitionPrices, stockRecords } = useData();
  const [canal, setCanal] = useState<"Droguería" | "Farmacia">("Droguería");

  const totalProductos = new Set(angelusPrices.map(p => p.productoAngelus)).size;
  const totalAngelus   = angelusPrices.length;

  const drogueriaPrices = angelusPrices.filter(p => p.canal === "Droguería");
  const farmaciaPrices  = angelusPrices.filter(p => p.canal === "Farmacia");

  const avgDrogueria = drogueriaPrices.length
    ? drogueriaPrices.reduce((a, b) => a + b.precio, 0) / drogueriaPrices.length
    : 0;
  const avgFarmacia = farmaciaPrices.length
    ? farmaciaPrices.reduce((a, b) => a + b.precio, 0) / farmaciaPrices.length
    : 0;

  let alertasCriticas          = 0;
  let masBaratoQueCompetencia  = 0;
  const brechasRiesgosas       = new Set<string>();

  const productos = Array.from(new Set(angelusPrices.map(p => p.productoAngelus)));

  productos.forEach(prod => {
    const prices     = angelusPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    const min        = Math.min(...prices);
    const max        = Math.max(...prices);
    const variation  = prices.length > 1 ? ((max - min) / min) * 100 : 0;
    if (variation > 35) alertasCriticas++;

    const prodDrog = drogueriaPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    const prodFarm = farmaciaPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    if (prodDrog.length && prodFarm.length) {
      if (Math.min(...prodFarm) < Math.max(...prodDrog)) brechasRiesgosas.add(prod);
    }

    const myMin      = Math.min(...prices);
    const compPrices = competitionPrices
      .filter(p => p.productoAngelusReferencia === prod)
      .map(p => p.precioCompetidor);
    if (compPrices.length && myMin < Math.min(...compPrices)) masBaratoQueCompetencia++;
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

  // ── Line chart: price evolution per product over last 7 months ───────────────
  const { history: lineHistory, selectedProducts } = useMemo(
    () => generatePriceHistory(canal, 5),
    [canal]
  );

  const yDomain = useMemo(() => {
    const allVals = lineHistory.flatMap(row =>
      selectedProducts.map(p => (row[p] as number) ?? 0)
    );
    const lo = Math.min(...allVals);
    const hi = Math.max(...allVals);
    const pad = (hi - lo) * 0.15;
    return [Math.max(0, lo - pad), hi + pad];
  }, [lineHistory, selectedProducts]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Resumen Ejecutivo</h2>
        <p className="text-muted-foreground">Visión general del mercado y precios de Angelus.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Analizados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary" data-testid="kpi-total-productos">{totalProductos}</div>
            <p className="text-xs text-muted-foreground">En {totalAngelus} puntos de venta</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-destructive/20 bg-destructive/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Alertas Críticas</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="kpi-alertas-criticas">{alertasCriticas}</div>
            <p className="text-xs text-destructive/80">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Promedio Droguería</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-avg-drogueria">{formatCurrency(avgDrogueria)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Promedio Farmacia</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="kpi-avg-farmacia">{formatCurrency(avgFarmacia)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Líder en Precio vs Comp.</CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600" data-testid="kpi-lider-precio">{masBaratoQueCompetencia}</div>
            <p className="text-xs text-muted-foreground">Productos</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brechas Riesgosas (Canal)</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600" data-testid="kpi-brechas">{brechasRiesgosas.size}</div>
            <p className="text-xs text-muted-foreground">Farmacia más barata que Droguería</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Quiebre Stock</CardTitle>
            <Package className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="kpi-quiebre-stock">{quiebresStock}</div>
            <p className="text-xs text-muted-foreground">Droguerías afectadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">

        {/* LINE CHART — Evolución de precios por producto */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base">Evolución de Precios — Top 5 Productos</CardTitle>
              <Select value={canal} onValueChange={(v) => setCanal(v as "Droguería" | "Farmacia")} data-testid="select-canal-dashboard">
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Droguería">Droguería</SelectItem>
                  <SelectItem value="Farmacia">Farmacia</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Eje X: mes · Eje Y: precio USD</p>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lineHistory} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
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
                  width={52}
                />
                <RechartsTooltip
                  formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {selectedProducts.map((prod, i) => (
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
          </CardContent>
        </Card>

        {/* PIE CHART — Distribución de alertas */}
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Distribución de Alertas por Nivel</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {alertDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={ALERT_COLORS[entry.name] ?? "#94a3b8"} />
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
