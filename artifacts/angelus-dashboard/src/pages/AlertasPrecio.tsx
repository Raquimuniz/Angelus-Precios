import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Download, Save } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

export default function AlertasPrecio() {
  const { angelusPrices, competitionPrices } = useData();
  const { toast } = useToast();

  // Store edits as raw strings so user can type digit-by-digit freely
  const [edits, setEdits] = useState<Record<string, string>>({});

  const alerts = useMemo(() => {
    const list: any[] = [];
    const products = Array.from(new Set(angelusPrices.map(p => p.productoAngelus)));

    products.forEach(prod => {
      ["Droguería", "Farmacia"].forEach(canal => {
        const myPrices   = angelusPrices.filter(p => p.productoAngelus === prod && p.canal === canal).sort((a, b) => a.precio - b.precio);
        const compPrices = competitionPrices.filter(p => p.productoAngelusReferencia === prod && p.canal === canal).sort((a, b) => a.precioCompetidor - b.precioCompetidor);
        if (!myPrices.length || !compPrices.length) return;

        const myBest  = myPrices[0];
        const compBest = compPrices[0];
        const varVsComp  = ((myBest.precio - compBest.precioCompetidor) / compBest.precioCompetidor) * 100;
        const myMax      = Math.max(...myPrices.map(p => p.precio));
        const internalVar = ((myMax - myBest.precio) / myBest.precio) * 100;

        let alertLevel = "Normal", recommendedAction = "";
        if (varVsComp > 15)       { alertLevel = "Crítico"; recommendedAction = "Ajustar precio sugerido"; }
        else if (internalVar > 35) { alertLevel = "Crítico"; recommendedAction = `Revisar precio en ${canal.toLowerCase()}`; }
        else if (varVsComp > 5)    { alertLevel = "Alto";    recommendedAction = "Monitorear competencia"; }

        if (alertLevel !== "Normal") {
          list.push({
            id:             `${prod}-${canal}`,
            nivelAlerta:    alertLevel,
            canal,
            producto:       prod,
            miPrecioActual: myBest.precio,
            dondeSoyBarato: myBest.drogueria,
            compBarato:     compBest.productoCompetidor,
            precioComp:     compBest.precioCompetidor,
            dondeComp:      compBest.cliente,
            sugeridoAuto:   compBest.precioCompetidor * 0.90,
            recomendacion:  recommendedAction,
          });
        }
      });
    });

    return list.sort((a, b) => (a.nivelAlerta === "Crítico" ? -1 : 1));
  }, [angelusPrices, competitionPrices]);

  // Get the current numeric value for a row (for calculations)
  const getNumericPrice = (alert: any): number => {
    const raw = edits[alert.id];
    if (raw !== undefined) {
      const parsed = parseFloat(raw);
      return isNaN(parsed) ? alert.sugeridoAuto : parsed;
    }
    return alert.sugeridoAuto;
  };

  // Get the raw string for the input
  const getRawString = (alert: any): string => {
    return edits[alert.id] !== undefined ? edits[alert.id] : alert.sugeridoAuto.toFixed(2);
  };

  const exportExcel = () => {
    const dataToExport = alerts.map(a => {
      const suggested = getNumericPrice(a);
      return {
        "Nivel Alerta":        a.nivelAlerta,
        "Canal":               a.canal,
        "Producto":            a.producto,
        "Precio Actual Angelus": a.miPrecioActual,
        "Cliente Angelus Barato": a.dondeSoyBarato,
        "Competidor Más Barato": a.compBarato,
        "Precio Competencia":  a.precioComp,
        "Cliente Competencia": a.dondeComp,
        "Precio Sugerido Auto": a.sugeridoAuto,
        "Precio Sugerido Final": suggested,
        "Variación vs Actual %": ((suggested - a.miPrecioActual) / a.miPrecioActual) * 100,
        "Variación vs Comp %":   ((suggested - a.precioComp) / a.precioComp) * 100,
        "Acción Recomendada":  a.recomendacion,
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alertas");
    XLSX.writeFile(wb, "Angelus_Alertas_Precios.xlsx");
    toast({ title: "Exportación exitosa", description: "El archivo Excel se ha descargado." });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Alertas y Precio Sugerido</h2>
          <p className="text-muted-foreground">Gestión de alertas y modelado de escenarios de precios.</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => toast({ title: "Guardado", description: "Escenario guardado temporalmente." })}>
            <Save className="mr-2 h-4 w-4" /> Guardar Escenario
          </Button>
          <Button onClick={exportExcel}>
            <Download className="mr-2 h-4 w-4" /> Descargar Excel
          </Button>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Alerta</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead>Mi Actual</TableHead>
              <TableHead>Comp. Actual</TableHead>
              <TableHead>Sugerido Auto</TableHead>
              <TableHead className="w-32">Precio Sugerido</TableHead>
              <TableHead>Var vs Actual</TableHead>
              <TableHead>Var vs Comp</TableHead>
              <TableHead>Acción Recomendada</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {alerts.map((row) => {
              const suggested = getNumericPrice(row);
              const varActual = ((suggested - row.miPrecioActual) / row.miPrecioActual) * 100;
              const varComp   = ((suggested - row.precioComp) / row.precioComp) * 100;

              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <Badge className={row.nivelAlerta === "Crítico" ? "bg-destructive" : "bg-orange-500"}>
                      {row.nivelAlerta}
                    </Badge>
                  </TableCell>
                  <TableCell>{row.canal}</TableCell>
                  <TableCell className="font-medium">{row.producto}</TableCell>
                  <TableCell>{formatCurrency(row.miPrecioActual)}</TableCell>
                  <TableCell>{formatCurrency(row.precioComp)}</TableCell>
                  <TableCell className="text-muted-foreground italic">{formatCurrency(row.sugeridoAuto)}</TableCell>
                  <TableCell>
                    {/* Raw string input — allows digit-by-digit typing */}
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={getRawString(row)}
                      onChange={(e) =>
                        setEdits(prev => ({ ...prev, [row.id]: e.target.value }))
                      }
                      onBlur={(e) => {
                        const parsed = parseFloat(e.target.value);
                        if (!isNaN(parsed))
                          setEdits(prev => ({ ...prev, [row.id]: parsed.toFixed(2) }));
                      }}
                      className="h-8 w-28 text-right font-mono"
                    />
                  </TableCell>
                  <TableCell className={varActual > 0 ? "text-emerald-600" : "text-destructive"}>
                    {formatPercentage(varActual)}
                  </TableCell>
                  <TableCell className={varComp > 0 ? "text-destructive" : "text-emerald-600"}>
                    {formatPercentage(varComp)}
                  </TableCell>
                  <TableCell className="text-xs font-medium text-primary">{row.recomendacion}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
