import * as mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// ─────────────────────────────────────────────────────────────────────────────
// Extração de texto
// ─────────────────────────────────────────────────────────────────────────────

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdfjs-dist não precisa de worker no Node — desabilitar explicitamente
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      pageTexts.push(pageText);
    }

    return pageTexts.join("\n").trim();
  } catch (error) {
    console.error("[documentProcessor] Erro ao parsear PDF:", error);
    throw new Error("Falha ao processar o arquivo PDF.");
  }
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value ?? "").trim();
  } catch (error) {
    console.error("[documentProcessor] Erro ao parsear DOCX:", error);
    throw new Error("Falha ao processar o arquivo DOCX.");
  }
}

/**
 * Roteador principal: escolhe o parser pelo MIME type.
 */
export async function extractTextFromDocument(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    return extractTextFromPDF(buffer);
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return extractTextFromDOCX(buffer);
  }

  throw new Error(`Tipo de documento não suportado: ${mimeType}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilitários (puros — usados nos testes)
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORTED_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]);

export function isSupportedDocumentType(mimeType: string): boolean {
  return SUPPORTED_TYPES.has(mimeType);
}

export function getFileExtension(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
  };
  return map[mimeType] ?? "unknown";
}