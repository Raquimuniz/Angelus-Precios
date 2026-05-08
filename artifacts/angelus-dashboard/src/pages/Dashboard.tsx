import { useMemo, useState, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";
import { useData } from "@/context/DataContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import { AlertCircle, DollarSign, Package, TrendingDown, TrendingUp } from "lucide-react";
import { generateProductVsCompetitors } from "@/lib/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/MultiSelect";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const COMP_COLORS = ["#E11D48", "#F97316", "#F59E0B", "#8B5CF6", "#EC4899", "#64748B"];
const ALERT_COLORS: Record<string, string> = {
  "Crítico": "#E11D48", "Alto": "#F97316", "Medio": "#FBBF24", "Normal": "#10B981",
};

function ProductCombobox({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = options.filter(p => p.toLowerCase().includes(search.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="h-8 w-56 justify-between text-xs font-normal truncate">
          <span className="truncate">{value || "Seleccionar producto..."}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar producto..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>Sin resultados</CommandEmpty>
            <CommandGroup>
              {filtered.map(p => (
                <CommandItem key={p} value={p} onSelect={() => { onChange(p); setOpen(false); setSearch(""); }}>
                  <Check className={cn("mr-2 h-3 w-3", value === p ? "opacity-100" : "opacity-0")} />
                  {p}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function Dashboard() {
  const { angelusPrices, competitionPrices, stockRecords, productNames } = useData();
  const [, setLocation] = useLocation();

  const [canal,            setCanal]            = useState<"Droguería" | "Farmacia">("Droguería");
  const [chartProduct,     setChartProduct]     = useState<string>("");
  const [chartCompetitors, setChartCompetitors] = useState<string[]>([]);

  // Sync product when data loads
  useEffect(() => {
    if (productNames.length) setChartProduct(p => p || productNames[0]);
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

  // Reset competitor selection when product changes
  useEffect(() => {
    setChartCompetitors(productCompetitors.slice(0, 3));
  }, [productCompetitors]);

  const drogueriaPrices = angelusPrices.filter(p => p.canal === "Droguería");
  const farmaciaPrices  = angelusPrices.filter(p => p.canal === "Farmacia");
  const canalPrices     = canal === "Droguería" ? drogueriaPrices : farmaciaPrices;

  const totalProductos = new Set(angelusPrices.map(p => p.productoAngelus)).size;
  const totalPuntos    = angelusPrices.length;
  const avgCanal       = canalPrices.length ? canalPrices.reduce((a, b) => a + b.precio, 0) / canalPrices.length : 0;
  const avgDrogueria   = drogueriaPrices.length ? drogueriaPrices.reduce((a, b) => a + b.precio, 0) / drogueriaPrices.length : 0;
  const avgFarmacia    = farmaciaPrices.length ? farmaciaPrices.reduce((a, b) => a + b.precio, 0) / farmaciaPrices.length : 0;

  let alertasCriticas = 0, masBaratoQueCompetencia = 0;
  const brechasRiesgosas = new Set<string>();
  const prods = Array.from(new Set(angelusPrices.map(p => p.productoAngelus)));

  prods.forEach(prod => {
    const prices = angelusPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    if (!prices.length) return;
    const min = Math.min(...prices), max = Math.max(...prices);
    if (prices.length > 1 && ((max - min) / min) * 100 > 35) alertasCriticas++;
    const df = drogueriaPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    const ff = farmaciaPrices.filter(p => p.productoAngelus === prod).map(p => p.precio);
    if (df.length && ff.length && Math.min(...ff) < Math.max(...df)) brechasRiesgosas.add(prod);
    const cp = competitionPrices.filter(p => p.productoAngelusReferencia === prod).map(p => p.precioCompetidor);
    if (cp.length && min < Math.min(...cp)) masBaratoQueCompetencia++;
  });

  const quiebresStock = stockRecords.filter(s => s.estadoStock === "Quiebre" || s.estadoStock === "Crítico").length;
  alertasCriticas += quiebresStock;

  const alertDistribution = [
    { name: "Crítico", value: alertasCriticas },
    { name: "Alto",    value: Math.max(1, Math.floor(totalProductos * 0.3)) },
    { name: "Medio",   value: Math.max(1, Math.floor(totalProductos * 0.4)) },
    { name: "Normal",  value: Math.max(1, Math.floor(totalProductos * 0.8)) },
  ];

  const lineHistory = useMemo(
    () => chartProduct && chartCompetitors.length
      ? generateProductVsCompetitors(chartProduct, chartCompetitors, canal)
      : [],
    [chartProduct, chartCompetitors, canal]
  );
  const allLineKeys = ["Angelus", ...chartCompetitors];
  const yDomain = useMemo(() => {
    const vals = lineHistory.flatMap(r => allLineKeys.map(k => (r[k] as number) ?? 0)).filter(v => v > 0);
    if (!vals.length) return [0, 50];
    const lo = Math.min(...vals), hi = Math.max(...vals), pad = Math.max((hi - lo) * 0.2, 1);
    return [Math.max(0, lo - pad), hi + pad];
  }, [lineHistory, allLineKeys]);

  const kpiCard = (
    title: string, value: ReactNode, sub: string,
    icon: ReactNode, route: string, colorClass = ""
  ) => (
    <Card
      className={`shadow-sm cursor-pointer hover:shadow-md hover:border-primary/40 transition-all ${colorClass}`}
      onClick={() => setLocation(route)}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Resumen Ejecutivo</h2>
          <p className="text-muted-foreground">Visión general del mercado y precios de Angelus.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Canal:</span>
          <Select value={canal} onValueChange={(v) => setCanal(v as "Droguería" | "Farmacia")}>
            <SelectTrigger className="h-9 w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Droguería">Droguería</SelectItem>
              <SelectItem value="Farmacia">Farmacia</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {kpiCard("Productos Analizados", <span className="text-primary">{totalProductos}</span>,
          `En ${totalPuntos} puntos de venta`, <Package className="h-4 w-4 text-muted-foreground" />, "/angelus-vs-angelus")}
        {kpiCard("Alertas Críticas", <span className="text-destructive">{alertasCriticas}</span>,
          "Requieren atención inmediata", <AlertCircle className="h-4 w-4 text-destructive" />, "/alertas",
          "border-destructive/20 bg-destructive/5")}
        {kpiCard(`Precio Promedio — ${canal}`, <span>{formatCurrency(avgCanal)}</span>,
          `Drog: ${formatCurrency(avgDrogueria)} · Farm: ${formatCurrency(avgFarmacia)}`,
          <DollarSign className="h-4 w-4 text-muted-foreground" />, "/angelus-vs-angelus")}
        {kpiCard("Líder en Precio vs Comp.", <span className="text-emerald-600">{masBaratoQueCompetencia}</span>,
          "Productos más baratos que competencia", <TrendingDown className="h-4 w-4 text-emerald-500" />, "/angelus-vs-competencia")}
        {kpiCard("Brechas Riesgosas", <span className="text-orange-600">{brechasRiesgosas.size}</span>,
          "Farmacia más barata que Droguería", <TrendingUp className="h-4 w-4 text-orange-500" />, "/angelus-vs-angelus")}
        {kpiCard("Riesgo Quiebre Stock", <span className="text-destructive">{quiebresStock}</span>,
          "Droguerías en quiebre o crítico", <Package className="h-4 w-4 text-destructive" />, "/stock")}
      </div>

      <Separator />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Mi Producto vs Competencia</CardTitle>
            <p className="text-xs text-muted-foreground">
              Canal: <strong>{canal}</strong> · Eje X: mes · Eje Y: precio USD ·
              <span className="text-[#1B4F8A] font-semibold"> Azul = Angelus</span>
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              <ProductCombobox value={chartProduct} onChange={setChartProduct} options={productNames} />
              <MultiSelect
                options={productCompetitors}
                selected={chartCompetitors}
                onChange={setChartCompetitors}
                placeholder="Competidores..."
                className="h-8 text-xs"
              />
            </div>
          </CardHeader>
          <CardContent className="h-[290px]">
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

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Distribución de Alertas por Nivel</CardTitle>
            <p className="text-xs text-muted-foreground">Haz clic en un nivel para ver los productos</p>
          </CardHeader>
          <CardContent className="h-[330px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={alertDistribution}
                  cx="50%" cy="50%"
                  innerRadius={70} outerRadius={115} paddingAngle={4}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                  onClick={() => setLocation("/alertas")}
                  style={{ cursor: "pointer" }}
                >
                  {alertDistribution.map((entry, i) => (
                    <Cell key={i} fill={ALERT_COLORS[entry.name] ?? "#94a3b8"} />
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
