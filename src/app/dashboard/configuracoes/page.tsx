import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export default function ConfiguracoesPage() {
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
      <div className="flex flex-col items-center gap-1 text-center">
        <Settings className="h-12 w-12 text-muted-foreground" />
        <h3 className="text-2xl font-bold tracking-tight font-headline">
          Módulo de Configurações
        </h3>
        <p className="text-sm text-muted-foreground">
          Esta área está em construção. Aqui você poderá gerenciar usuários, permissões e integrações.
        </p>
      </div>
    </div>
  );
}
