import { useState, useMemo } from "react";
import { useData } from "@/context/DataContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatPercentage } from "@/lib/utils";
import { Download, Save, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

export default function AlertasPrecio() {
  const { angelusPrices, competitionPrices, isDataLoaded } = useData();
  const { toast } = useToast();

  const [edits, setEdits] = useState<Record<string, string>>({});

  const alerts = useMemo(() => {
    const list: any[] = [];
    const products = Array.from(new Set(angelusPrices.map(p => p.productoAngelus)));

    products.forEach(prod => {
      (["Droguería", "Farmacia"] as const).forEach(canal => {
        const myPrices   = angelusPrices
          .filter(p => p.productoAngelus === prod && p.canal === canal)
          .sort((a, b) => a.precio - b.precio);
        const compPrices = competitionPrices
          .filter(p => p.productoAngelusReferencia === prod && p.canal === canal)
          .sort((a, b) => a.precioCompetidor - b.precioCompetidor);

        if (!myPrices.length) return;

        const myBest      = myPrices[0];
        const myMax       = Math.max(...myPrices.map(p => p.precio));
        const internalVar = myBest.precio > 0 ? ((myMax - myBest.precio) / myBest.precio) * 100 : 0;

        // Case 1 — comparison vs competition (only when comp data exists for this molecule)
        if (compPrices.length) {
          const compBest  = compPrices[0];
          const varVsComp = myBest.precio > 0
            ? ((myBest.precio - compBest.precioCompetidor) / compBest.precioCompetidor) * 100
            : 0;

          let alertLevel = "Normal", recommendedAction = "";
          if (varVsComp > 15)        { alertLevel = "Crítico"; recommendedAction = "Ajustar precio sugerido — estás significativamente por encima de la competencia"; }
          else if (varVsComp > 5)    { alertLevel = "Alto";    recommendedAction = "Monitorear — competencia más barata"; }
          else if (internalVar > 35) { alertLevel = "Crítico"; recommendedAction = `Revisar dispersión interna en ${canal.toLowerCase()}`; }

          if (alertLevel !== "Normal") {
            list.push({
              id:             `${prod}-${canal}-comp`,
              nivelAlerta:    alertLevel,
              canal,
              producto:       prod,
              miPrecioActual: myBest.precio,
              dondeSoyBarato: myBest.drogueria,
              compBarato:     compBest.productoCompetidor,
              compLab:        compBest.laboratorioCompetidor,
              precioComp:     compBest.precioCompetidor,
              dondeComp:      compBest.cliente,
              sugeridoAuto:   compBest.precioCompetidor * 0.90,
              recomendacion:  recommendedAction,
              tipoAlerta:     "vs Competencia",
            });
          }
        }

        // Case 2 — internal dispersion alert (even without comp data)
        if (internalVar > 35 && !compPrices.length) {
          list.push({
            id:             `${prod}-${canal}-internal`,
            nivelAlerta:    "Crítico",
            canal,
            producto:       prod,
            miPrecioActual: myBest.precio,
            dondeSoyBarato: myBest.drogueria,
            compBarato:     "—",
            compLab:        "—",
            precioComp:     myMax,
            dondeComp:      "—",
            sugeridoAuto:   myBest.precio,
            recomendacion:  `Dispersión interna de ${internalVar.toFixed(0)}% — revisar precios en ${canal.toLowerCase()}`,
            tipoAlerta:     "Dispersión Interna",
          });
        }
      });
    });

    return list.sort((a, b) => (a.nivelAlerta === "Crítico" && b.nivelAlerta !== "Crítico" ? -1 : 1));
  }, [angelusPrices, competitionPrices]);

  const getNumericPrice = (alert: any): number => {
    const raw = edits[alert.id];
    if (raw !== undefined) {
      const parsed = parseFloat(raw);
      return isNaN(parsed) ? alert.sugeridoAuto : parsed;
    }
    return alert.sugeridoAuto;
  };

  const getRawString = (alert: any): string =>
    edits[alert.id] !== undefined ? edits[alert.id] : alert.sugeridoAuto.toFixed(2);

  const exportExcel = () => {
    const dataToExport = alerts.map(a => {
      const suggested = getNumericPrice(a);
      return {
        "Nivel Alerta":             a.nivelAlerta,
        "Tipo Alerta":              a.tipoAlerta,
        "Canal":                    a.canal,
        "Producto":                 a.producto,
        "Precio Actual Angelus":    a.miPrecioActual,
        "Cliente Angelus Barato":   a.dondeSoyBarato,
        "Competidor Más Barato":    a.compBarato,
        "Laboratorio Competidor":   a.compLab,
        "Precio Competencia":       a.precioComp,
        "Cliente Competencia":      a.dondeComp,
        "Precio Sugerido Auto":     a.sugeridoAuto,
        "Precio Sugerido Final":    suggested,
        "Variación vs Actual %":    ((suggested - a.miPrecioActual) / a.miPrecioActual) * 100,
        "Variación vs Comp %":      ((suggested - a.precioComp) / a.precioComp) * 100,
        "Acción Recomendada":       a.recomendacion,
      };
    });
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Alertas");
    XLSX.writeFile(wb, "Angelus_Alertas_Precios.xlsx");
    toast({ title: "Exportación exitosa", description: "El archivo Excel se ha descargado." });
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-primary">Alertas y Precio Sugerido</h2>
          <p className="text-muted-foreground">
            {alerts.length > 0
              ? `${alerts.length} alertas detectadas — ajusta el precio sugerido y exporta.`
              : "Sin alertas detectadas con los datos cargados."}
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => toast({ title: "Guardado", description: "Escenario guardado temporalmente." })}>
            <Save className="mr-2 h-4 w-4" /> Guardar Escenario
          </Button>
          <Button onClick={exportExcel} disabled={alerts.length === 0}>
            <Download className="mr-2 h-4 w-4" /> Descargar Excel
          </Button>
        </div>
      </div>

      {alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center border rounded-lg bg-card p-8">
          <p className="text-muted-foreground font-medium">No se detectaron alertas.</p>
          <p className="text-xs text-muted-foreground max-w-md">
            Las alertas se generan cuando el precio de Angelus supera al competidor más de 5%, o cuando
            hay una dispersión interna de precios mayor al 35%. Asegúrate de haber cargado tanto el archivo
            de precios Angelus como el de competencia.
          </p>
        </div>
      ) : (
        <div className="rounded-md border bg-card shadow-sm overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alerta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Canal</TableHead>
                <TableHead>Producto</TableHead>
                <TableHead>Mi Actual</TableHead>
                <TableHead>Comp. + Barato</TableHead>
                <TableHead>Lab.</TableHead>
                <TableHead>Precio Comp.</TableHead>
                <TableHead>Sugerido Auto</TableHead>
                <TableHead className="w-32">Precio Sugerido</TableHead>
                <TableHead>Δ vs Actual</TableHead>
                <TableHead>Δ vs Comp</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((row) => {
                const suggested  = getNumericPrice(row);
                const varActual  = row.miPrecioActual > 0 ? ((suggested - row.miPrecioActual) / row.miPrecioActual) * 100 : 0;
                const varComp    = row.precioComp > 0    ? ((suggested - row.precioComp)    / row.precioComp)    * 100 : 0;

                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Badge className={row.nivelAlerta === "Crítico" ? "bg-destructive" : "bg-orange-500"}>
                        {row.nivelAlerta}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{row.tipoAlerta}</TableCell>
                    <TableCell>{row.canal}</TableCell>
                    <TableCell className="font-medium max-w-[180px] truncate" title={row.producto}>{row.producto}</TableCell>
                    <TableCell className="font-bold text-primary">{formatCurrency(row.miPrecioActual)}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate" title={row.compBarato}>{row.compBarato}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[80px] truncate" title={row.compLab}>{row.compLab}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(row.precioComp)}</TableCell>
                    <TableCell className="text-muted-foreground italic">{formatCurrency(row.sugeridoAuto)}</TableCell>
                    <TableCell>
                      <Input
                        type="text"
                        inputMode="decimal"
                        value={getRawString(row)}
                        onChange={(e) => setEdits(prev => ({ ...prev, [row.id]: e.target.value }))}
                        onBlur={(e) => {
                          const parsed = parseFloat(e.target.value);
                          if (!isNaN(parsed)) setEdits(prev => ({ ...prev, [row.id]: parsed.toFixed(2) }));
                        }}
                        className="h-8 w-28 text-right font-mono"
                      />
                    </TableCell>
                    <TableCell className={varActual >= 0 ? "text-emerald-600" : "text-destructive"}>
                      {varActual > 0 ? "+" : ""}{formatPercentage(varActual)}
                    </TableCell>
                    <TableCell className={varComp > 0 ? "text-destructive" : "text-emerald-600"}>
                      {varComp > 0 ? "+" : ""}{formatPercentage(varComp)}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-primary max-w-[140px]">{row.recomendacion}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
