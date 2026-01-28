import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";

export default function AudienciasPage() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
      <div className="flex flex-col items-center gap-1 text-center">
        <Calendar className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-2xl font-bold tracking-tight font-headline">
          Módulo de Audiências
        </h3>
        <p className="text-sm text-muted-foreground">
          Esta área está em construção. Aqui você poderá agendar e visualizar todas as audiências.
        </p>
      </div>
    </div>
  );
}
