import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban } from "lucide-react";

export default function ProcessosPage() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
      <div className="flex flex-col items-center gap-1 text-center">
        <FolderKanban className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-2xl font-bold tracking-tight font-headline">
          Módulo de Processos
        </h3>
        <p className="text-sm text-muted-foreground">
          Esta área está em construção. Aqui você poderá gerenciar todos os processos jurídicos.
        </p>
      </div>
    </div>
  );
}
