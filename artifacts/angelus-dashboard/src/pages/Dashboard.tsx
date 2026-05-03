import { useData } from "@/context/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { AlertCircle, ArrowDown, ArrowUp, DollarSign, Package, TrendingDown, TrendingUp } from "lucide-react";

const COLORS = ['#1B4F8A', '#00B4B4', '#F59E0B', '#E11D48', '#10B981'];
const ALERT_COLORS = {
  "Crítico": "#E11D48",
  "Alto": "#F97316",
  "Medio": "#FBBF24",
  "Normal": "#10B981"
};

export default function Dashboard() {
  const { angelusPrices, competitionPrices, stockRecords } = useData();

  const totalProductos = new Set(angelusPrices.map(p => p.productoAngelus)).size;
  const totalAngelus = angelusPrices.length;
  const totalComp = competitionPrices.length;

  const drogueriaPrices = angelusPrices.filter(p => p.canal === "Droguería");
  const farmaciaPrices = angelusPrices.filter(p => p.canal === "Farmacia");

  const avgDrogueria = drogueriaPrices.length ? drogueriaPrices.reduce((a, b) => a + b.precio, 0) / drogueriaPrices.length : 0;
  const avgFarmacia = farmaciaPrices.length ? farmaciaPrices.reduce((a, b) => a + b.precio, 0) / farmaciaPrices.length : 0;

  // Calculate alerts (simplified for dashboard)
  let alertasCriticas = 0;
  let masBaratoQueCompetencia = 0;
  
  // Brecha Riesgosa (Farmacia < Drogueria)
  const brechasRiesgosas = new Set<string>();

  // Compare internal prices
  const productos = Array.from(new Set(angelusPrices.map(p => p.productoAngelus)));
  const variacionData = productos.map(prod => {
    const prices = angelusPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    if (!prices.length) return null;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const diff = max - min;
    const variation = (diff / min) * 100;
    
    if (variation > 35) alertasCriticas++;

    // Farmacia vs Drogueria
    const prodDrog = drogueriaPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    const prodFarm = farmaciaPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    if (prodDrog.length && prodFarm.length) {
      const minFarm = Math.min(...prodFarm);
      const maxDrog = Math.max(...prodDrog);
      if (minFarm < maxDrog) brechasRiesgosas.add(prod);
    }

    return { name: prod, variation, min, max };
  }).filter(Boolean) as { name: string, variation: number, min: number, max: number }[];

  // Compare vs Competencia
  productos.forEach(prod => {
    const myMin = Math.min(...angelusPrices.filter(p => p.productoAngelus === prod).map(p => p.precio));
    const compPrices = competitionPrices.filter(p => p.productoAngelusReferencia === prod).map(p => p.precioCompetidor);
    if (compPrices.length) {
      const compMin = Math.min(...compPrices);
      if (myMin < compMin) masBaratoQueCompetencia++;
    }
  });

  const quiebresStock = stockRecords.filter(s => s.estadoStock === "Quiebre" || s.estadoStock === "Crítico").length;
  alertasCriticas += quiebresStock;

  const topVariacion = [...variacionData].sort((a, b) => b.variation - a.variation).slice(0, 10);

  const alertDistribution = [
    { name: "Crítico", value: alertasCriticas },
    { name: "Alto", value: Math.floor(totalProductos * 0.3) }, // Mocked
    { name: "Medio", value: Math.floor(totalProductos * 0.4) }, // Mocked
    { name: "Normal", value: Math.floor(totalProductos * 0.8) }, // Mocked
  ].filter(a => a.value > 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Resumen Ejecutivo</h2>
        <p className="text-muted-foreground">Visión general del mercado y precios de Angelus.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Analizados</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{totalProductos}</div>
            <p className="text-xs text-muted-foreground">En {totalAngelus} puntos de venta</p>
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
            <CardTitle className="text-sm font-medium">Precio Promedio (Droguería)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgDrogueria)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Precio Promedio (Farmacia)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(avgFarmacia)}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Líder en Precio vs Comp.</CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{masBaratoQueCompetencia}</div>
            <p className="text-xs text-muted-foreground">Productos</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Brechas Riesgosas (Canal)</CardTitle>
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
            <p className="text-xs text-muted-foreground">Droguerías afectadas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle>Top 10 Productos con Mayor Variación de Precio</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topVariacion} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => `\${v}%`} />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <RechartsTooltip formatter={(value: number) => [`\${value.toFixed(1)}%`, 'Variación']} />
                <Bar dataKey="variation" fill="#1B4F8A" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1 shadow-sm">
          <CardHeader>
            <CardTitle>Distribución de Alertas por Nivel</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {alertDistribution.map((entry, index) => (
                    <Cell key={`cell-\${index}`} fill={ALERT_COLORS[entry.name as keyof typeof ALERT_COLORS]} />
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