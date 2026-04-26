import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, FileText, ArrowRight, Plus, Loader2, Calendar } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function HistoryPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: editals, isLoading } = trpc.editals.list.useQuery(undefined, {
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Histórico de Editais</h1>
            <p className="text-slate-600 mt-2">{editals?.length || 0} edital(is) analisado(s)</p>
          </div>
          <Button onClick={() => setLocation("/")} className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Edital
          </Button>
        </div>

        {(!editals || editals.length === 0) && (
          <Card className="border-slate-200">
            <CardContent className="pt-12 text-center">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Nenhum edital analisado</h3>
              <p className="text-slate-600 mb-6">Comece fazendo upload de um edital para análise</p>
              <Button onClick={() => setLocation("/")} className="gap-2">
                <Plus className="w-4 h-4" />
                Analisar Edital
              </Button>
            </CardContent>
          </Card>
        )}

        {editals && editals.length > 0 && (
          <div className="space-y-4">
            {editals.map((edital) => (
              <EditalCard key={edital.id} edital={edital} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EditalCard({ edital }: { edital: any }) {
  const [, setLocation] = useLocation();
  const { data: analysis } = trpc.editals.getAnalysis.useQuery(
    { editalId: edital.id },
    { enabled: !!edital.id }
  );

  const hasCriticalDeadlines = analysis?.hasCriticalDeadline;
  const criticalCount = analysis?.deadlines?.filter((d: any) => d.isCritical).length || 0;
  const highAlertCount = analysis?.alerts?.filter((a: any) => a.severity === "high").length || 0;

  return (
    <Card
      className={`border-2 transition-all hover:shadow-lg cursor-pointer ${hasCriticalDeadlines ? "border-red-200 bg-red-50" : "border-slate-200"}`}
      onClick={() => setLocation(`/analysis/${edital.id}`)}
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-start gap-3 mb-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 truncate">{edital.fileName}</h3>
                {edital.organization && <p className="text-sm text-slate-600 mt-1">{edital.organization}</p>}
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatDistanceToNow(new Date(edital.createdAt), { addSuffix: true, locale: ptBR })}
              </span>
              <span>{(edital.fileSize / 1024).toFixed(1)} KB</span>
            </div>
            {analysis && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200">
                <p className="text-sm text-slate-700 line-clamp-2">{analysis.summary}</p>
              </div>
            )}
            {(hasCriticalDeadlines || highAlertCount > 0) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {hasCriticalDeadlines && (
                  <Alert className="border-red-200 bg-red-50 py-2 px-3 flex-1 min-w-fit">
                    <AlertCircle className="h-3 w-3 text-red-600 inline mr-2" />
                    <span className="text-xs font-semibold text-red-800">{criticalCount} prazo(s) crítico(s)</span>
                  </Alert>
                )}
                {highAlertCount > 0 && (
                  <Alert className="border-amber-200 bg-amber-50 py-2 px-3 flex-1 min-w-fit">
                    <AlertCircle className="h-3 w-3 text-amber-600 inline mr-2" />
                    <span className="text-xs font-semibold text-amber-800">{highAlertCount} alerta(s) importante(s)</span>
                  </Alert>
                )}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" className="ml-4 flex-shrink-0"
            onClick={(e) => { e.stopPropagation(); setLocation(`/analysis/${edital.id}`); }}>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}