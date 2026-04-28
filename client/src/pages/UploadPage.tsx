import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, FileText, AlertCircle, CheckCircle2, History } from "lucide-react";
import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function UploadPage() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = trpc.editals.upload.useMutation();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFile = async (file: File) => {
    if (!file) return;

    const supportedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];

    if (!supportedTypes.includes(file.type)) {
      toast.error("Tipo de arquivo não suportado. Use PDF ou DOCX.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 50MB.");
      return;
    }

    setIsUploading(true);
    try {
      const buffer = await file.arrayBuffer();
      const result = await uploadMutation.mutateAsync({
        fileName: file.name,
        fileBuffer: new Uint8Array(buffer) as any,
        mimeType: file.type,
        fileSize: file.size,
      });

      toast.success("Edital analisado com sucesso!");
      setTimeout(() => setLocation(`/analysis/${result.edital.id}`), 1500);
    } catch (error) {
      toast.error("Erro ao processar o edital. Tente novamente.");
      console.error(error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) processFile(files[0]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (files && files.length > 0) processFile(files[0]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200 px-6 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          {/* Logo / Nome do projeto */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-bold text-slate-900 tracking-tight">Edital</span>
              <span className="text-base font-bold text-blue-600 tracking-tight">Analyzer</span>
            </div>
          </div>

          {/* Botão Histórico */}
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
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Analisador Inteligente de Editais
          </h1>
          <p className="text-lg text-slate-500">
            Faça upload de seus editais e receba uma análise estruturada e completa
          </p>
        </div>

        {/* Upload Card */}
        <Card className="border-2 border-dashed border-slate-200 hover:border-slate-300 transition-colors">
          <CardContent className="pt-8">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative rounded-lg p-12 text-center transition-all ${
                isDragging
                  ? "bg-blue-50 border-2 border-blue-300"
                  : "bg-slate-50 border-2 border-transparent"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                onChange={handleFileSelect}
                className="hidden"
                disabled={isUploading}
              />

              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <Upload className="w-8 h-8 text-blue-600" />
                </div>
              </div>

              <h3 className="text-xl font-semibold text-slate-900 mb-2">
                Arraste seu edital aqui
              </h3>
              <p className="text-slate-500 mb-6">
                ou clique para selecionar um arquivo
              </p>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="mb-4"
              >
                {isUploading ? "Processando..." : "Selecionar Arquivo"}
              </Button>

              <p className="text-sm text-slate-400">
                Formatos suportados: PDF, DOCX (máximo 50MB)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              </div>
              <span className="font-semibold text-sm text-slate-800">Extração Precisa</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Análise inteligente via IA para extrair todas as informações críticas
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-semibold text-sm text-slate-800">Estruturado</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Informações organizadas em seções claras: prazos, requisitos, alertas
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-600" />
              </div>
              <span className="font-semibold text-sm text-slate-800">Alertas</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Destaque automático de prazos críticos e pontos de atenção importantes
            </p>
          </div>
        </div>

        {/* User info */}
        {user && (
          <div className="mt-10 text-center text-xs text-slate-400 flex items-center justify-center gap-3">
            <span>Conectado como <span className="font-medium text-slate-600">{user.displayName || user.email}</span></span>
            <span className="text-slate-200">|</span>
            <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors">
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
}