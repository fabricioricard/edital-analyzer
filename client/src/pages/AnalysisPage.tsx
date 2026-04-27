import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle, Calendar, CheckCircle2, Download, FileText,
  ArrowLeft, Clock, History, Building2, AlertTriangle,
  ShieldCheck, Scale, ChevronRight,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getRiskColor(severity: string) {
  if (severity === "high") return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", dot: "bg-red-500" };
  if (severity === "medium") return { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", dot: "bg-amber-500" };
  return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", dot: "bg-blue-500" };
}

function getDeadlineRisk(daysUntil: number) {
  if (daysUntil < 0) return { label: "Encerrado", color: "bg-gray-100 text-gray-500 border-gray-200", progress: 100, progressColor: "bg-gray-400" };
  if (daysUntil <= 3) return { label: "Crítico", color: "bg-red-100 text-red-700 border-red-300", progress: 95, progressColor: "bg-red-500" };
  if (daysUntil <= 7) return { label: "Urgente", color: "bg-orange-100 text-orange-700 border-orange-300", progress: 75, progressColor: "bg-orange-500" };
  if (daysUntil <= 30) return { label: `${daysUntil} dias`, color: "bg-amber-100 text-amber-700 border-amber-300", progress: 40, progressColor: "bg-amber-400" };
  return { label: `${daysUntil} dias`, color: "bg-green-100 text-green-700 border-green-200", progress: 15, progressColor: "bg-green-500" };
}

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  try {
    const [y, m, d] = dateStr.split("-");
    return `${d}/${m}/${y}`;
  } catch { return dateStr; }
}

// ── Componentes de seção ──────────────────────────────────────────────────────

function DeadlinesTab({ deadlines }: { deadlines: any[] }) {
  if (!deadlines?.length) return <Empty text="Nenhum prazo identificado" />;
  const sorted = [...deadlines].sort((a, b) => a.daysUntil - b.daysUntil);
  return (
    <div className="space-y-3">
      {sorted.map((d: any, i: number) => {
        const risk = getDeadlineRisk(d.daysUntil);
        return (
          <div key={i} className={`rounded-xl border-2 p-4 ${risk.color}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-1">
                <Clock className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="font-semibold text-sm">{d.name}</span>
              </div>
              <Badge className={`shrink-0 ${risk.color} border`}>{risk.label}</Badge>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono">{formatDate(d.date)}</span>
              <div className="flex-1 h-2 bg-white/60 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${risk.progressColor}`}
                  style={{ width: `${risk.progress}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TimelineTab({ deadlines }: { deadlines: any[] }) {
  if (!deadlines?.length) return <Empty text="Nenhum prazo para exibir na linha do tempo" />;
  const sorted = [...deadlines]
    .filter(d => d.date)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return (
    <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 ml-3">
      {sorted.map((d: any, i: number) => {
        const risk = getDeadlineRisk(d.daysUntil);
        return (
          <div key={i} className="relative">
            <div className={`absolute -left-[1.65rem] w-4 h-4 rounded-full border-2 border-white ${risk.progressColor}`} />
            <div className={`rounded-lg border p-3 ${risk.color}`}>
              <p className="font-semibold text-sm">{d.name}</p>
              <p className="text-xs mt-1 font-mono">{formatDate(d.date)}</p>
              <Badge className={`mt-2 text-xs ${risk.color} border`}>{risk.label}</Badge>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RequirementsTab({ requirements }: { requirements: any[] }) {
  if (!requirements?.length) return <Empty text="Nenhum requisito identificado" />;
  return (
    <div className="space-y-4">
      {requirements.map((req: any, i: number) => (
        <div key={i} className="rounded-xl border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-slate-800">{req.category}</span>
            <Badge variant="secondary" className="ml-auto text-xs">{req.items?.length || 0} itens</Badge>
          </div>
          <ul className="divide-y divide-slate-100">
            {req.items?.map((item: string, j: number) => (
              <li key={j} className="flex items-start gap-3 px-4 py-3 text-sm text-slate-700">
                <ChevronRight className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function DocumentsTab({ documents }: { documents: string[] }) {
  if (!documents?.length) return <Empty text="Nenhum documento identificado" />;
  return (
    <div className="grid gap-2">
      {documents.map((doc: string, i: number) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-white transition-colors">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-purple-600" />
          </div>
          <span className="text-sm text-slate-700 leading-relaxed">{doc}</span>
        </div>
      ))}
    </div>
  );
}

function AlertsTab({ alerts }: { alerts: any[] }) {
  if (!alerts?.length) return <Empty text="Nenhum ponto de atenção identificado" />;
  return (
    <div className="space-y-3">
      {alerts.map((alert: any, i: number) => {
        const c = getRiskColor(alert.severity);
        return (
          <div key={i} className={`rounded-xl border p-4 ${c.bg} ${c.border} border`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${c.dot}`} />
              <span className={`text-xs font-bold uppercase tracking-wide ${c.text}`}>{alert.severity === "high" ? "Alto" : alert.severity === "medium" ? "Médio" : "Baixo"} — {alert.category}</span>
            </div>
            <p className={`text-sm ${c.text}`}>{alert.message}</p>
          </div>
        );
      })}
    </div>
  );
}

function PenaltiesTab({ penalties }: { penalties: any[] }) {
  if (!penalties?.length) return <Empty text="Nenhuma penalidade identificada" />;
  return (
    <div className="space-y-3">
      {penalties.map((p: any, i: number) => (
        <div key={i} className="rounded-xl border border-red-200 overflow-hidden">
          <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex items-center gap-2">
            <Scale className="w-4 h-4 text-red-600" />
            <span className="font-semibold text-sm text-red-800">{p.violation}</span>
          </div>
          <div className="px-4 py-3 text-sm text-slate-700">{p.penalty}</div>
        </div>
      ))}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-12 text-slate-400">
      <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-40" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const { user } = useAuth();
  const [match, params] = useRoute("/analysis/:editalId");
  const [, setLocation] = useLocation();

  const editalId = match && params?.editalId ? parseInt(params.editalId) : null;
  const { data: analysis, isLoading, error } = trpc.editals.getAnalysis.useQuery(
    { editalId: editalId! },
    { enabled: !!editalId && !!user }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
          <p className="text-sm text-slate-500">Carregando análise...</p>
        </div>
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Análise não encontrada</CardTitle>
            {error && <p className="text-red-600 text-sm mt-1">{error.message}</p>}
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/history")} className="w-full">Voltar ao Histórico</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExport = () => {
    const lines = [
      "RELATÓRIO DE ANÁLISE DE EDITAL",
      "=".repeat(60),
      "",
      "RESUMO", "-".repeat(60), analysis.summary || "", "",
    ];
    if (analysis.deadlines?.length) {
      lines.push("PRAZOS", "-".repeat(60));
      analysis.deadlines.forEach((d: any) => lines.push(`• ${d.name}: ${formatDate(d.date)} (${d.daysUntil} dias)${d.isCritical ? " [CRÍTICO]" : ""}`));
      lines.push("");
    }
    if (analysis.requirements?.length) {
      lines.push("REQUISITOS", "-".repeat(60));
      analysis.requirements.forEach((r: any) => { lines.push(`${r.category}:`); r.items?.forEach((i: string) => lines.push(`  • ${i}`)); });
      lines.push("");
    }
    if (analysis.requiredDocuments?.length) {
      lines.push("DOCUMENTOS EXIGIDOS", "-".repeat(60));
      analysis.requiredDocuments.forEach((d: string) => lines.push(`• ${d}`));
      lines.push("");
    }
    if (analysis.alerts?.length) {
      lines.push("PONTOS DE ATENÇÃO", "-".repeat(60));
      analysis.alerts.forEach((a: any) => lines.push(`[${a.severity.toUpperCase()}] ${a.category}: ${a.message}`));
    }
    const el = document.createElement("a");
    el.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(lines.join("\n")));
    el.setAttribute("download", `analise-${analysis.id}.txt`);
    el.click();
    toast.success("Relatório exportado!");
  };

  const criticalCount = analysis.deadlines?.filter((d: any) => d.isCritical).length || 0;
  const highAlertsCount = analysis.alerts?.filter((a: any) => a.severity === "high").length || 0;
  const overallRisk = criticalCount > 0 ? "high" : highAlertsCount > 0 ? "medium" : "low";
  const riskLabel = { high: "Alto Risco", medium: "Atenção", low: "Normal" };
  const riskStyle = {
    high: "bg-red-100 text-red-700 border-red-300",
    medium: "bg-amber-100 text-amber-700 border-amber-300",
    low: "bg-green-100 text-green-700 border-green-200",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-1 text-slate-600">
              <ArrowLeft className="w-4 h-4" /> Início
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/history")} className="gap-1 text-slate-600">
              <History className="w-4 h-4" /> Histórico
            </Button>
          </div>
          <Button size="sm" onClick={handleExport} className="gap-1">
            <Download className="w-4 h-4" /> Exportar
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Título e organização */}
        <div className="mb-6">
          <div className="flex items-start gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 leading-tight">{analysis.edital?.title || "Análise de Edital"}</h1>
              {analysis.edital?.organization && (
                <div className="flex items-center gap-1 mt-1 text-sm text-slate-500">
                  <Building2 className="w-3.5 h-3.5" />
                  <span>{analysis.edital.organization}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Indicadores */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className={`rounded-xl border-2 p-3 ${riskStyle[overallRisk]}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Risco Geral</span>
            </div>
            <p className="text-lg font-bold">{riskLabel[overallRisk]}</p>
          </div>
          <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
            <div className="flex items-center gap-1.5 mb-1 text-slate-500">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Prazos</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{analysis.deadlines?.length || 0}</p>
            {criticalCount > 0 && <p className="text-xs text-red-600 font-medium">{criticalCount} crítico(s)</p>}
          </div>
          <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
            <div className="flex items-center gap-1.5 mb-1 text-slate-500">
              <FileText className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Documentos</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{analysis.requiredDocuments?.length || 0}</p>
          </div>
          <div className="rounded-xl border-2 border-slate-200 bg-white p-3">
            <div className="flex items-center gap-1.5 mb-1 text-slate-500">
              <AlertCircle className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wide">Alertas</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{analysis.alerts?.length || 0}</p>
            {highAlertsCount > 0 && <p className="text-xs text-amber-600 font-medium">{highAlertsCount} urgente(s)</p>}
          </div>
        </div>

        {/* Resumo */}
        {analysis.summary && (
          <div className="rounded-xl border border-slate-200 bg-white p-4 mb-6">
            <p className="text-sm text-slate-700 leading-relaxed">{analysis.summary}</p>
          </div>
        )}

        {/* Abas */}
        <Tabs defaultValue="deadlines">
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 mb-6 h-auto gap-1 bg-slate-100 p-1 rounded-xl">
            <TabsTrigger value="deadlines" className="rounded-lg text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Clock className="w-3.5 h-3.5 mr-1" />Prazos
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-lg text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Calendar className="w-3.5 h-3.5 mr-1" />Timeline
            </TabsTrigger>
            <TabsTrigger value="requirements" className="rounded-lg text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" />Requisitos
            </TabsTrigger>
            <TabsTrigger value="documents" className="rounded-lg text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <FileText className="w-3.5 h-3.5 mr-1" />Documentos
            </TabsTrigger>
            <TabsTrigger value="alerts" className="rounded-lg text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <AlertCircle className="w-3.5 h-3.5 mr-1" />Alertas
            </TabsTrigger>
            <TabsTrigger value="penalties" className="rounded-lg text-xs py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <Scale className="w-3.5 h-3.5 mr-1" />Penalidades
            </TabsTrigger>
          </TabsList>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <TabsContent value="deadlines" className="mt-0">
              <DeadlinesTab deadlines={analysis.deadlines as any[]} />
            </TabsContent>
            <TabsContent value="timeline" className="mt-0">
              <TimelineTab deadlines={analysis.deadlines as any[]} />
            </TabsContent>
            <TabsContent value="requirements" className="mt-0">
              <RequirementsTab requirements={analysis.requirements as any[]} />
            </TabsContent>
            <TabsContent value="documents" className="mt-0">
              <DocumentsTab documents={analysis.requiredDocuments as string[]} />
            </TabsContent>
            <TabsContent value="alerts" className="mt-0">
              <AlertsTab alerts={analysis.alerts as any[]} />
            </TabsContent>
            <TabsContent value="penalties" className="mt-0">
              <PenaltiesTab penalties={analysis.penalties as any[]} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}