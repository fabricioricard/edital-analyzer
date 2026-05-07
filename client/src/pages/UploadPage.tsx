import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Upload, FileText, AlertCircle, CheckCircle2, History, X, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

const SUPPORTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];
const MAX_SIZE = 50 * 1024 * 1024;
const MAX_FILES = 5;

interface FileItem {
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  editalId?: number;
  error?: string;
}

export default function UploadPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.editals.upload.useMutation();

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const valid: FileItem[] = [];
    Array.from(incoming).forEach((file) => {
      if (files.length + valid.length >= MAX_FILES) {
        toast.error(`Máximo de ${MAX_FILES} arquivos por vez.`);
        return;
      }
      if (!SUPPORTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: tipo não suportado. Use PDF ou DOCX.`);
        return;
      }
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name}: arquivo muito grande (máx 50MB).`);
        return;
      }
      if (files.some((f) => f.file.name === file.name)) {
        toast.error(`${file.name}: já adicionado.`);
        return;
      }
      valid.push({ file, status: "pending" });
    });
    setFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processAll = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (!pending.length) return;
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== "pending") continue;

      setFiles((prev) =>
        prev.map((f, idx) => idx === i ? { ...f, status: "uploading" } : f)
      );

      try {
        const buffer = await files[i].file.arrayBuffer();
        const result = await uploadMutation.mutateAsync({
          fileName: files[i].file.name,
          fileBuffer: new Uint8Array(buffer) as any,
          mimeType: files[i].file.type,
          fileSize: files[i].file.size,
        });

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "done", editalId: result.edital.id } : f
          )
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error", error: "Erro ao processar" } : f
          )
        );
      }
    }

    setIsProcessing(false);
    const done = files.filter((f) => f.status === "done");
    if (done.length > 0) toast.success(`${done.length + 1} análise(s) concluída(s)!`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const allDone = files.length > 0 && files.every((f) => f.status === "done" || f.status === "error");
  const hasPending = files.some((f) => f.status === "pending");

  const statusIcon = (status: FileItem["status"]) => {
    if (status === "uploading") return <Loader2 className="w-4 h-4 animate-spin text-blue-500" />;
    if (status === "done") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    if (status === "error") return <AlertCircle className="w-4 h-4 text-red-500" />;
    return <FileText className="w-4 h-4 text-slate-400" />;
  };

  const statusLabel = (item: FileItem) => {
    if (item.status === "uploading") return <span className="text-xs text-blue-500">Analisando...</span>;
    if (item.status === "done") return (
      <button
        onClick={() => setLocation(`/analysis/${item.editalId}`)}
        className="text-xs text-blue-600 hover:underline font-medium"
      >
        Ver análise →
      </button>
    );
    if (item.status === "error") return <span className="text-xs text-red-500">{item.error}</span>;
    return <span className="text-xs text-slate-400">{(item.file.size / 1024).toFixed(0)} KB</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-slate-900 tracking-tight">Edital</span>
              <span className="text-base font-bold text-blue-600 tracking-tight">Analyzer</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/history")}
            className="gap-2 text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-colors"
          >
            <History className="w-4 h-4" />
            Histórico
          </Button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Analisador Inteligente de Editais
          </h1>
          <p className="text-lg text-slate-500">
            Envie até {MAX_FILES} editais e receba análises estruturadas
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !isProcessing && fileInputRef.current?.click()}
          className={`rounded-2xl border-2 border-dashed p-10 text-center cursor-pointer transition-all mb-4 ${
            isDragging
              ? "border-blue-400 bg-blue-50"
              : files.length >= MAX_FILES
              ? "border-slate-200 bg-slate-50 opacity-50 cursor-not-allowed"
              : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc"
            multiple
            onChange={(e) => addFiles(e.currentTarget.files)}
            className="hidden"
            disabled={isProcessing || files.length >= MAX_FILES}
          />
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Upload className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <p className="font-semibold text-slate-700 mb-1">
            {files.length >= MAX_FILES ? `Limite de ${MAX_FILES} arquivos atingido` : "Arraste seus editais aqui"}
          </p>
          <p className="text-sm text-slate-400">
            PDF ou DOCX • até 50MB cada • máximo {MAX_FILES} arquivos
          </p>
        </div>

        {/* Lista de arquivos */}
        {files.length > 0 && (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden mb-4">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {files.length} arquivo(s)
              </span>
              {!isProcessing && !allDone && (
                <button
                  onClick={() => setFiles([])}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                >
                  Limpar todos
                </button>
              )}
            </div>
            <ul className="divide-y divide-slate-100">
              {files.map((item, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-3">
                  {statusIcon(item.status)}
                  <span className="flex-1 text-sm text-slate-700 truncate">{item.file.name}</span>
                  {statusLabel(item)}
                  {item.status === "pending" && !isProcessing && (
                    <button onClick={() => removeFile(i)} className="text-slate-300 hover:text-red-400 transition-colors ml-2">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Botão de análise */}
        {hasPending && (
          <Button
            onClick={processAll}
            disabled={isProcessing}
            className="w-full h-11 text-base font-semibold mb-6"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analisando...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" />Analisar {files.filter(f => f.status === "pending").length} edital(is)</>
            )}
          </Button>
        )}

        {/* Ver histórico quando todos prontos */}
        {allDone && (
          <Button
            onClick={() => setLocation("/history")}
            className="w-full h-11 text-base font-semibold mb-6"
          >
            <History className="w-4 h-4 mr-2" />
            Ver todas as análises no Histórico
          </Button>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {[
            { icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, bg: "bg-green-100", title: "Extração Precisa", desc: "IA extrai todas as informações críticas do edital" },
            { icon: <FileText className="w-4 h-4 text-blue-600" />, bg: "bg-blue-100", title: "Estruturado", desc: "Prazos, requisitos, documentos e alertas organizados" },
            { icon: <AlertCircle className="w-4 h-4 text-amber-600" />, bg: "bg-amber-100", title: "Alertas", desc: "Prazos críticos e pontos de atenção em destaque" },
          ].map((f, i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-lg ${f.bg} flex items-center justify-center`}>{f.icon}</div>
                <span className="font-semibold text-sm text-slate-800">{f.title}</span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* User info */}
        {user && (
          <div className="mt-10 text-center text-xs text-slate-400 flex items-center justify-center gap-3">
            <span>Conectado como <span className="font-medium text-slate-600">{user.displayName || user.email}</span></span>
            <span className="text-slate-200">|</span>
            <button onClick={logout} className="hover:text-red-500 transition-colors">Sair</button>
          </div>
        )}
      </div>
    </div>
  );
}