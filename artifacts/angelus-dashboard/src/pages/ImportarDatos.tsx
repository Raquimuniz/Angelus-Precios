import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, RefreshCcw } from "lucide-react";
import { useData } from "@/context/DataContext";
import { useToast } from "@/hooks/use-toast";

export default function ImportarDatos() {
  const { resetToSampleData } = useData();
  const { toast } = useToast();

  const handleUpload = (type: string) => {
    // In a real app, this would process the file with papaparse or xlsx.
    // Since this is frontend only and mock data, we just show a success toast.
    toast({
      title: "Archivo procesado",
      description: `Los datos de \${type} han sido importados exitosamente.`,
    });
  };

  const handleReset = () => {
    resetToSampleData();
    toast({
      title: "Datos restaurados",
      description: "Se han restaurado los datos de demostración originales.",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-primary">Importar Datos</h2>
        <p className="text-muted-foreground">Actualice la base de datos de inteligencia comercial cargando archivos CSV o Excel.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Precios Angelus</CardTitle>
            <CardDescription>Formatos aceptados: .csv, .xlsx</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted m-4 rounded-md bg-muted/20">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
            <Button variant="outline" onClick={() => handleUpload("Precios Angelus")}>
              <UploadCloud className="mr-2 h-4 w-4" /> Seleccionar Archivo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Precios Competencia</CardTitle>
            <CardDescription>Formatos aceptados: .csv, .xlsx</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted m-4 rounded-md bg-muted/20">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
            <Button variant="outline" onClick={() => handleUpload("Precios Competencia")}>
              <UploadCloud className="mr-2 h-4 w-4" /> Seleccionar Archivo
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock Droguerías</CardTitle>
            <CardDescription>Formatos aceptados: .csv, .xlsx</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-muted m-4 rounded-md bg-muted/20">
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground mb-4" />
            <Button variant="outline" onClick={() => handleUpload("Stock")}>
              <UploadCloud className="mr-2 h-4 w-4" /> Seleccionar Archivo
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-12 pt-6 border-t">
        <h3 className="text-lg font-medium text-destructive mb-4">Zona de Peligro</h3>
        <Card className="border-destructive/50">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="font-medium">Restaurar base de datos de demostración</p>
              <p className="text-sm text-muted-foreground">Esta acción eliminará cualquier dato importado y restaurará la data de prueba.</p>
            </div>
            <Button variant="destructive" onClick={handleReset}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Restaurar Datos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}