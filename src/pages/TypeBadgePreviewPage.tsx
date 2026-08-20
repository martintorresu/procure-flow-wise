import { TypeBadge } from "@/pages/DashboardPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TypeBadgePreviewPage() {
  const types: Array<"compra" | "licitacion" | "contrato" | "permiso" | "personalizado"> = [
    "compra",
    "licitacion",
    "contrato",
    "permiso",
    "personalizado",
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Preview — TypeBadge variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {types.map((t) => (
            <div key={t} className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-24 capitalize">{t}</span>
              <TypeBadge type={t} />
            </div>
          ))}
          <div className="flex items-center gap-3 pt-2 border-t">
            <span className="text-sm text-muted-foreground w-24">null</span>
            <TypeBadge type={null} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
