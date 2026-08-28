import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FolderKanban, ArrowRight } from "lucide-react";
import { SEO } from "@/components/SEO";
import { useProjects } from "@/hooks/useProjects";
import { useProcesses } from "@/hooks/useProcesses";

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects();
  const { data: processes = [] } = useProcesses();

  return (
    <div className="space-y-6">
      <SEO title="Proyectos" description="Proyectos y su cadena de procesos asociados." path="/projects" />
      <div>
        <h1 className="text-2xl font-bold">Proyectos</h1>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Cargando…" : `${projects.length} proyectos`}
        </p>
      </div>

      {isLoading && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      )}

      {!isLoading && projects.length === 0 && (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-2 text-muted-foreground">
            <FolderKanban className="w-8 h-8 opacity-40" />
            <p className="text-sm">Aún no hay proyectos. Crea uno al iniciar un proceso.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => {
          const count = processes.filter((x) => x.project_id === p.id).length;
          return (
            <Link key={p.id} to={`/projects/${p.id}`}>
              <Card className="h-full transition-colors hover:bg-muted/40 hover:border-primary/40">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-accent" />
                    <span className="font-medium">{p.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {count} {count === 1 ? "proceso" : "procesos"}
                  </p>
                  <Button variant="ghost" size="sm" className="text-accent px-0">
                    Ver cadena <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
