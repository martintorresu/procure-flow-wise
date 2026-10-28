import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import readXlsxFile from "read-excel-file/browser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, Download, FileSpreadsheet, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlatformAdmin } from "@/hooks/usePlatformAdmin";
import { SEO } from "@/components/SEO";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { parseCsv, toCsv } from "@/lib/csv";
import {
  CATALOG_KINDS, kindConfig, analyzeImport, commitImport, summarize,
  type CatalogKind, type Grid, type PlannedRow,
} from "@/lib/catalogImport";

interface LoadedFile { name: string; sheets: { sheet: string; data: Grid }[]; sheet: string }

async function readFile(file: File, hint?: string): Promise<LoadedFile> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    return { name: file.name, sheets: [{ sheet: "CSV", data: parseCsv(await file.text()) }], sheet: "CSV" };
  }
  const sheets = (await readXlsxFile(file)) as unknown as { sheet: string; data: Grid }[];
  const pick = sheets.find((s) => s.sheet === hint)?.sheet ?? sheets[0]?.sheet ?? "";
  return { name: file.name, sheets, sheet: pick };
}

const ACTION_LABEL: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  create: { label: "Crear", variant: "default" },
  update: { label: "Nueva versión", variant: "secondary" },
  skip: { label: "Omitir", variant: "outline" },
  error: { label: "Error", variant: "destructive" },
};

function download(name: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

export default function CatalogImportPage() {
  const { data: isAdmin, isLoading } = usePlatformAdmin();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [kind, setKind] = useState<CatalogKind>("legal_processes");
  const [main, setMain] = useState<LoadedFile | null>(null);
  const [adjust, setAdjust] = useState<LoadedFile | null>(null);
  const [rows, setRows] = useState<PlannedRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<{ created_count: number; updated_count: number; skipped_count: number; error_count: number } | null>(null);
  const cfg = kindConfig(kind);

  const { data: jobs = [] } = useQuery({
    queryKey: ["catalog-import-jobs"],
    enabled: !!isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("import_jobs")
        .select("id,target_table,file_name,status,created_count,updated_count,skipped_count,error_count,created_at")
        .eq("kind", "legal_catalog").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const summary = useMemo(() => (rows ? summarize(rows) : null), [rows]);

  if (isLoading) return null;
  if (!isAdmin) return <Navigate to="/" replace />;

  const reset = () => { setRows(null); setResult(null); };

  const onFile = async (f: File | undefined, which: "main" | "adjust") => {
    if (!f) return;
    reset();
    try {
      const loaded = await readFile(f, which === "main" ? cfg.mainSheetHint : cfg.adjust?.sheetHint);
      which === "main" ? setMain(loaded) : setAdjust(loaded);
    } catch (e) {
      toast({ title: "No se pudo leer el archivo", description: (e as Error).message, variant: "destructive" });
    }
  };

  const grid = (f: LoadedFile | null) => f?.sheets.find((s) => s.sheet === f.sheet)?.data ?? null;

  const analyze = async () => {
    if (!main) return;
    setBusy(true); reset();
    try {
      const res = await analyzeImport(supabase, kind, grid(main)!, grid(adjust));
      if (res.error) toast({ title: "Archivo no válido", description: res.error, variant: "destructive" });
      else setRows(res.rows);
    } catch (e) {
      toast({ title: "Error al analizar", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const commit = async () => {
    if (!rows || !main) return;
    setConfirmOpen(false); setBusy(true);
    try {
      const names = [main.name + (main.sheet !== "CSV" ? ` [${main.sheet}]` : ""), adjust ? `${adjust.name} [${adjust.sheet}]` : null].filter(Boolean).join(" + ");
      const r = await commitImport(supabase, kind, names, rows);
      setResult(r);
      qc.invalidateQueries({ queryKey: ["catalog-import-jobs"] });
      toast({ title: "Importación terminada", description: `${r.created_count} creados · ${r.updated_count} actualizados · ${r.skipped_count} omitidos · ${r.error_count} con error` });
    } catch (e) {
      toast({ title: "Error al guardar", description: (e as Error).message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const downloadErrors = () => {
    const errs = (rows ?? []).filter((r) => r.action === "error");
    download(`errores_${kind}.csv`, toCsv([["fila", "código", "errores"], ...errs.map((r) => [r.rowNumber, r.code, r.errors.join(" | ")])]));
  };

  const SheetPicker = ({ f, set }: { f: LoadedFile; set: (f: LoadedFile) => void }) =>
    f.sheets.length > 1 ? (
      <Select value={f.sheet} onValueChange={(v) => { reset(); set({ ...f, sheet: v }); }}>
        <SelectTrigger className="h-8 w-56"><SelectValue /></SelectTrigger>
        <SelectContent>{f.sheets.map((s) => <SelectItem key={s.sheet} value={s.sheet}>{s.sheet}</SelectItem>)}</SelectContent>
      </Select>
    ) : null;

  return (
    <div className="space-y-6">
      <SEO title="Centro de carga" description="Importación del catálogo legal compartido." path="/catalogo-legal" />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Upload className="w-5 h-5 text-accent" /> Centro de carga</h1>
        <p className="text-sm text-muted-foreground">Catálogo legal compartido entre todas las organizaciones. Solo administradores de plataforma.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Qué vas a cargar</CardTitle>
          <CardDescription>{cfg.description} Solo se actualiza un registro cuando la versión del archivo es mayor que la vigente.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Catálogo</Label>
              <Select value={kind} onValueChange={(v) => { setKind(v as CatalogKind); setMain(null); setAdjust(null); reset(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{CATALOG_KINDS.map((k) => <SelectItem key={k.kind} value={k.kind}>{k.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Archivo (CSV o XLSX)</Label>
              <Input type="file" accept=".csv,.xlsx" onChange={(e) => onFile(e.target.files?.[0], "main")} />
              {main && <SheetPicker f={main} set={setMain} />}
            </div>
            {cfg.adjust && (
              <div className="space-y-1.5">
                <Label>{cfg.adjust.label} (opcional, XLSX)</Label>
                <Input type="file" accept=".xlsx,.csv" onChange={(e) => onFile(e.target.files?.[0], "adjust")} />
                {adjust && <SheetPicker f={adjust} set={setAdjust} />}
              </div>
            )}
          </div>
          <Button onClick={analyze} disabled={!main || busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />} Vista previa
          </Button>
        </CardContent>
      </Card>

      {rows && summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Vista previa</CardTitle>
            <CardDescription>Nada se ha guardado todavía.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2 text-sm">
              <Badge>{summary.created} por crear</Badge>
              <Badge variant="secondary">{summary.updated} nuevas versiones</Badge>
              <Badge variant="outline">{summary.skipped} omitidos</Badge>
              <Badge variant="destructive">{summary.errors} con error</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setConfirmOpen(true)} disabled={busy || summary.created + summary.updated === 0 || !!result}>
                <CheckCircle2 className="w-4 h-4" /> Confirmar e importar
              </Button>
              {summary.errors > 0 && <Button variant="outline" onClick={downloadErrors}><Download className="w-4 h-4" /> Descargar errores</Button>}
            </div>
            {result && (
              <p className="text-sm font-medium">
                Resultado: {result.created_count} creados · {result.updated_count} actualizados · {result.skipped_count} omitidos · {result.error_count} con error
              </p>
            )}
            <div className="max-h-[480px] overflow-auto rounded border">
              <Table>
                <TableHeader><TableRow><TableHead className="w-16">Fila</TableHead><TableHead>Código</TableHead><TableHead>Acción</TableHead><TableHead>Detalle</TableHead></TableRow></TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.rowNumber}>
                      <TableCell className="text-muted-foreground">{r.rowNumber}</TableCell>
                      <TableCell className="font-mono text-xs">{r.code}</TableCell>
                      <TableCell><Badge variant={ACTION_LABEL[r.action].variant}>{ACTION_LABEL[r.action].label}</Badge></TableCell>
                      <TableCell className="text-xs">{r.action === "error" ? <span className="text-destructive">{r.errors.join(" · ")}</span> : r.reason ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Historial de cargas</CardTitle></CardHeader>
        <CardContent>
          {jobs.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay cargas.</p> : (
            <Table>
              <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Catálogo</TableHead><TableHead>Archivo</TableHead><TableHead className="text-right">Creados</TableHead><TableHead className="text-right">Actualizados</TableHead><TableHead className="text-right">Omitidos</TableHead><TableHead className="text-right">Errores</TableHead></TableRow></TableHeader>
              <TableBody>
                {jobs.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell className="text-xs">{new Date(j.created_at).toLocaleString("es-CL")}</TableCell>
                    <TableCell className="text-xs">{CATALOG_KINDS.find((k) => k.kind === j.target_table)?.label ?? j.target_table}</TableCell>
                    <TableCell className="text-xs">{j.file_name}</TableCell>
                    <TableCell className="text-right">{j.created_count}</TableCell>
                    <TableCell className="text-right">{j.updated_count}</TableCell>
                    <TableCell className="text-right">{j.skipped_count}</TableCell>
                    <TableCell className="text-right">{j.error_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Importar al catálogo legal?</AlertDialogTitle>
            <AlertDialogDescription>
              Se crearán {summary?.created ?? 0} registros y {summary?.updated ?? 0} versiones nuevas en «{cfg.label}». Los registros del catálogo no se pueden borrar después.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={commit}>Importar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
