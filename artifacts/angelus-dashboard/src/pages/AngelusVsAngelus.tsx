import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from "recharts";

export default function AngelusVsAngelus() {
  const { angelusPrices } = useData();
  const [filterProduct, setFilterProduct] = useState("");
  const [filterCanal, setFilterCanal] = useState<string>("Todos");

  const tableData = useMemo(() => {
    let filtered = angelusPrices;
    if (filterProduct) {
      filtered = filtered.filter(p => p.productoAngelus.toLowerCase().includes(filterProduct.toLowerCase()));
    }
    if (filterCanal !== "Todos") {
      filtered = filtered.filter(p => p.canal === filterCanal);
    }

    const grouped = filtered.reduce((acc, curr) => {
      const key = `\${curr.productoAngelus}-\${curr.canal}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(curr);
      return acc;
    }, {} as Record<string, typeof angelusPrices>);

    return Object.entries(grouped).map(([key, prices]) => {
      const sortedPrices = [...prices].sort((a, b) => a.precio - b.precio);
      const minPrice = sortedPrices[0];
      const maxPrice = sortedPrices[sortedPrices.length - 1];
      const avg = prices.reduce((a, b) => a + b.precio, 0) / prices.length;
      
      const mid = Math.floor(sortedPrices.length / 2);
      const median = sortedPrices.length % 2 !== 0 ? sortedPrices[mid].precio : (sortedPrices[mid - 1].precio + sortedPrices[mid].precio) / 2;

      const diff = maxPrice.precio - minPrice.precio;
      const varPct = (diff / minPrice.precio) * 100;

      let alertLevel = "Verde";
      if (varPct > 35) alertLevel = "Rojo";
      else if (varPct > 20) alertLevel = "Naranja";
      else if (varPct > 10) alertLevel = "Amarillo";

      return {
        producto: minPrice.productoAngelus,
        canal: minPrice.canal,
        min: minPrice.precio,
        minCliente: minPrice.drogueria,
        max: maxPrice.precio,
        maxCliente: maxPrice.drogueria,
        avg,
        median,
        diff,
        varPct,
        clientesCount: prices.length,
        alertLevel
      };
    }).sort((a, b) => b.varPct - a.varPct);
  }, [angelusPrices, filterProduct, filterCanal]);

  // Check for Farmacia < Drogueria overall alerts
  const farmaciaMenorDrogueriaAlerts = useMemo(() => {
    const alerts = [];
    const products = new Set(angelusPrices.map(p => p.productoAngelus));
    for (const prod of products) {
      const drog = angelusPrices.filter(p => p.productoAngelus === prod && p.canal === "Droguería");
      const farm = angelusPrices.filter(p => p.productoAngelus === prod && p.canal === "Farmacia");
      if (drog.length && farm.length) {
        const maxDrog = Math.max(...drog.map(p => p.precio));
        const minFarm = Math.min(...farm.map(p => p.precio));
        if (minFarm < maxDrog) {
          alerts.push(prod);
        }
      }
    }
    return alerts;
  }, [angelusPrices]);

  const getAlertColor = (level: string) => {
    switch (level) {
      case "Rojo": return "bg-destructive text-destructive-foreground";
      case "Naranja": return "bg-orange-500 text-white";
      case "Amarillo": return "bg-yellow-500 text-white";
      case "Verde": return "bg-emerald-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const chartData = tableData.slice(0, 10).map(d => ({
    name: d.producto,
    Minimo: d.min,
    Promedio: d.avg,
    Maximo: d.max,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Angelus vs Angelus</h2>
        <p className="text-muted-foreground">Análisis de consistencia de precios internos.</p>
      </div>

      {farmaciaMenorDrogueriaAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ALERTA: Farmacia más barata que Droguería detectada</AlertTitle>
          <AlertDescription>
            Revisar productos: {farmaciaMenorDrogueriaAlerts.join(", ")}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-4 items-center bg-card p-4 rounded-lg shadow-sm border">
        <div className="flex-1 max-w-sm">
          <Input 
            placeholder="Buscar producto..." 
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
      </div>

      <div className="h-[400px] w-full bg-card p-4 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium mb-4">Min / Promedio / Max por Producto (Top 10 Variación)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis />
            <RechartsTooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="Minimo" fill="#10B981" />
            <Bar dataKey="Promedio" fill="#1B4F8A" />
            <Bar dataKey="Maximo" fill="#E11D48" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Producto</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Precio Mínimo</TableHead>
              <TableHead>Cliente Mín</TableHead>
              <TableHead>Precio Máximo</TableHead>
              <TableHead>Cliente Máx</TableHead>
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
                <TableCell className="font-medium">
                  {formatPercentage(row.varPct)}
                </TableCell>
                <TableCell>
                  <Badge className={getAlertColor(row.alertLevel)}>
                    {row.alertLevel}
                  </Badge>
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