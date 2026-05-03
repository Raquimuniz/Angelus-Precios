import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatCurrency, formatPercentage } from "@/lib/utils";

export default function AngelusVsCompetencia() {
  const { angelusPrices, competitionPrices } = useData();
  const [canal, setCanal] = useState<"Droguería" | "Farmacia">("Droguería");

  const tableData = useMemo(() => {
    const myPrices = angelusPrices.filter(p => p.canal === canal);
    const compPrices = competitionPrices.filter(p => p.canal === canal);

    const products = Array.from(new Set(myPrices.map(p => p.productoAngelus)));

    return products.map(prod => {
      const myProdPrices = myPrices.filter(p => p.productoAngelus === prod).sort((a, b) => a.precio - b.precio);
      const compProdPrices = compPrices.filter(p => p.productoAngelusReferencia === prod).sort((a, b) => a.precioCompetidor - b.precioCompetidor);

      if (!myProdPrices.length || !compProdPrices.length) return null;

      const myBest = myProdPrices[0];
      const compBest = compProdPrices[0];

      const varPct = ((myBest.precio - compBest.precioCompetidor) / compBest.precioCompetidor) * 100;

      let resultBadge = { label: "", color: "" };
      if (varPct < -3) resultBadge = { label: "Angelus más competitivo", color: "bg-emerald-500" };
      else if (varPct <= 3) resultBadge = { label: "Empatado", color: "bg-blue-500" };
      else if (varPct <= 15) resultBadge = { label: "Competencia más barata", color: "bg-orange-500" };
      else resultBadge = { label: "Alerta Crítica", color: "bg-destructive text-destructive-foreground" };

      return {
        producto: prod,
        miPrecio: myBest.precio,
        miDonde: myBest.drogueria,
        compNombre: compBest.productoCompetidor,
        compPrecio: compBest.precioCompetidor,
        compDonde: compBest.cliente,
        varPct,
        resultBadge
      };
    }).filter(Boolean) as any[];
  }, [angelusPrices, competitionPrices, canal]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Angelus vs Competencia</h2>
        <p className="text-muted-foreground">Comparativa de precios Angelus contra líderes del mercado.</p>
      </div>

      <div className="flex justify-center">
        <ToggleGroup type="single" value={canal} onValueChange={(v) => v && setCanal(v as "Droguería" | "Farmacia")}>
          <ToggleGroupItem value="Droguería" className="px-8">Droguerías</ToggleGroupItem>
          <ToggleGroupItem value="Farmacia" className="px-8">Farmacias</ToggleGroupItem>
        </ToggleGroup>
      </div>

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
            {tableData.sort((a, b) => b.varPct - a.varPct).map((row, idx) => (
              <TableRow key={idx}>
                <TableCell className="font-medium">{row.producto}</TableCell>
                <TableCell className="font-bold text-primary">{formatCurrency(row.miPrecio)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.miDonde}</TableCell>
                <TableCell>{row.compNombre}</TableCell>
                <TableCell className="font-bold text-muted-foreground">{formatCurrency(row.compPrecio)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{row.compDonde}</TableCell>
                <TableCell className={`font-medium \${row.varPct > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                  {row.varPct > 0 ? '+' : ''}{formatPercentage(row.varPct)}
                </TableCell>
                <TableCell>
                  <Badge className={row.resultBadge.color}>{row.resultBadge.label}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}