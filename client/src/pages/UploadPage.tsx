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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div />
          <Button
            variant="outline"
            onClick={() => setLocation("/history")}
            className="gap-2 text-slate-600"
          >
            <History className="w-4 h-4" />
            Histórico de Análises
          </Button>
        </div>

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 mb-3">
            Analisador Inteligente de Editais
          </h1>
          <p className="text-lg text-slate-600">
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
              <p className="text-slate-600 mb-6">
                ou clique para selecionar um arquivo
              </p>

              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="mb-4"
              >
                {isUploading ? "Processando..." : "Selecionar Arquivo"}
              </Button>

              <p className="text-sm text-slate-500">
                Formatos suportados: PDF, DOCX (máximo 50MB)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <CardTitle className="text-base">Extração Precisa</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Análise inteligente via IA para extrair todas as informações críticas
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <CardTitle className="text-base">Estruturado</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Informações organizadas em seções claras: prazos, requisitos, alertas
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-base">Alertas</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                Destaque automático de prazos críticos e pontos de atenção importantes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* User Info */}
        {user && (
          <div className="mt-12 text-center text-sm text-slate-600 flex items-center justify-center gap-4">
            <p>Conectado como <span className="font-semibold text-slate-900">{user.displayName || user.email}</span></p>
            <button
              onClick={logout}
              className="text-red-500 hover:underline text-xs"
            >
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
}