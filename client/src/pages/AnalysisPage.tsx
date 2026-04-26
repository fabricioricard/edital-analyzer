import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  ArrowLeft,
  Clock,
} from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Análise não encontrada</CardTitle>
            {error && <CardDescription className="text-red-600 mt-2">{error.message}</CardDescription>}
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation("/history")} className="w-full">
              Voltar ao Histórico
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleExport = () => {
    const text = generateTextReport(analysis);
    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
    element.setAttribute("download", `analise-edital-${analysis.id}.txt`);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Relatório exportado com sucesso!");
  };

  const criticalDeadlines = analysis.deadlines?.filter((d: any) => d.isCritical) || [];
  const highAlerts = analysis.alerts?.filter((a: any) => a.severity === "high") || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => setLocation("/history")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <Button onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            Exportar Relatório
          </Button>
        </div>

        <Card className="mb-8 border-slate-200">
          <CardHeader>
            <CardTitle className="text-2xl">Resumo da Análise</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-700 leading-relaxed">{analysis.summary}</p>
          </CardContent>
        </Card>

        {(criticalDeadlines.length > 0 || highAlerts.length > 0) && (
          <Alert className="mb-8 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Atenção:</strong> Este edital contém{" "}
              {criticalDeadlines.length > 0 && `${criticalDeadlines.length} prazo(s) crítico(s)`}
              {criticalDeadlines.length > 0 && highAlerts.length > 0 && " e "}
              {highAlerts.length > 0 && `${highAlerts.length} alerta(s) importante(s)`}.
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-8 border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Prazos Importantes
            </CardTitle>
            <CardDescription>{analysis.deadlines?.length || 0} prazo(s) identificado(s)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analysis.deadlines && analysis.deadlines.length > 0 ? (
                analysis.deadlines.map((deadline: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg border-2 ${deadline.isCritical ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900">{deadline.name}</h4>
                        <p className="text-sm text-slate-600 mt-1">{deadline.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {deadline.isCritical ? (
                          <Badge variant="destructive" className="gap-1">
                            <Clock className="w-3 h-3" />{deadline.daysUntil} dias
                          </Badge>
                        ) : (
                          <Badge variant="outline">{deadline.daysUntil} dias</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">Nenhum prazo identificado</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8 border-slate-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Requisitos
            </CardTitle>
            <CardDescription>{analysis.requirements?.length || 0} categoria(s) de requisitos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {analysis.requirements && analysis.requirements.length > 0 ? (
                analysis.requirements.map((req: any, idx: number) => (
                  <div key={idx}>
                    <h4 className="font-semibold text-slate-900 mb-3">{req.category}</h4>
                    <ul className="space-y-2">
                      {req.items.map((item: string, itemIdx: number) => (
                        <li key={itemIdx} className="flex items-start gap-3 text-slate-700">
                          <span className="text-blue-600 font-bold mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              ) : (
                <p className="text-slate-600">Nenhum requisito identificado</p>
              )}
            </div>
          </CardContent>
        </Card>

        {analysis.selectionCriteria && analysis.selectionCriteria.length > 0 && (
          <Card className="mb-8 border-slate-200">
            <CardHeader><CardTitle>Critérios de Seleção</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.selectionCriteria.map((criterion: any, idx: number) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-900">{criterion.criterion}</h4>
                      {criterion.weight && <Badge variant="secondary">{criterion.weight}%</Badge>}
                    </div>
                    <p className="text-sm text-slate-700">{criterion.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analysis.requiredDocuments && analysis.requiredDocuments.length > 0 && (
          <Card className="mb-8 border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Documentos Exigidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {analysis.requiredDocuments.map((doc: string, idx: number) => (
                  <li key={idx} className="flex items-start gap-3 text-slate-700">
                    <span className="text-purple-600 font-bold mt-0.5">✓</span>
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {analysis.alerts && analysis.alerts.length > 0 && (
          <Card className="mb-8 border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                Pontos de Atenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analysis.alerts.map((alert: any, idx: number) => (
                  <Alert key={idx} className={`border-l-4 ${alert.severity === "high" ? "border-l-red-500 bg-red-50" : alert.severity === "medium" ? "border-l-amber-500 bg-amber-50" : "border-l-blue-500 bg-blue-50"}`}>
                    <AlertDescription>
                      <div className="font-semibold text-sm mb-1">{alert.category}</div>
                      <div className="text-sm">{alert.message}</div>
                    </AlertDescription>
                  </Alert>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {analysis.penalties && analysis.penalties.length > 0 && (
          <Card className="border-slate-200">
            <CardHeader><CardTitle>Penalidades</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.penalties.map((penalty: any, idx: number) => (
                  <div key={idx} className="p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="font-semibold text-slate-900 mb-2">{penalty.violation}</h4>
                    <p className="text-sm text-slate-700">{penalty.penalty}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function generateTextReport(analysis: any): string {
  let report = "RELATÓRIO DE ANÁLISE DE EDITAL\n";
  report += "=".repeat(60) + "\n\n";
  report += "RESUMO\n" + "-".repeat(60) + "\n" + analysis.summary + "\n\n";
  if (analysis.deadlines?.length > 0) {
    report += "PRAZOS IMPORTANTES\n" + "-".repeat(60) + "\n";
    analysis.deadlines.forEach((d: any) => {
      report += `• ${d.name}: ${d.date} (${d.daysUntil} dias)${d.isCritical ? " [CRÍTICO]" : ""}\n`;
    });
    report += "\n";
  }
  if (analysis.requirements?.length > 0) {
    report += "REQUISITOS\n" + "-".repeat(60) + "\n";
    analysis.requirements.forEach((req: any) => {
      report += `${req.category}:\n`;
      req.items.forEach((item: string) => { report += `  • ${item}\n`; });
    });
    report += "\n";
  }
  if (analysis.requiredDocuments?.length > 0) {
    report += "DOCUMENTOS EXIGIDOS\n" + "-".repeat(60) + "\n";
    analysis.requiredDocuments.forEach((doc: string) => { report += `• ${doc}\n`; });
    report += "\n";
  }
  if (analysis.alerts?.length > 0) {
    report += "PONTOS DE ATENÇÃO\n" + "-".repeat(60) + "\n";
    analysis.alerts.forEach((alert: any) => {
      report += `[${alert.severity.toUpperCase()}] ${alert.category}: ${alert.message}\n`;
    });
  }
  return report;
}