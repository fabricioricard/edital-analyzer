import * as pdfParse from "pdf-parse";
import * as mammoth from "mammoth";

/**
 * Processa documentos PDF e DOCX para extrair texto
 */

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    const data = await (pdfParse as any).default(buffer);
    const text = data.text || "";
    return text.trim();
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF document");
  }
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value || "";
    return text.trim();
  } catch (error) {
    console.error("Error parsing DOCX:", error);
    throw new Error("Failed to parse DOCX document");
  }
}

export async function extractTextFromDocument(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    return extractTextFromPDF(buffer);
  } else if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return extractTextFromDOCX(buffer);
  } else {
    throw new Error(`Unsupported document type: ${mimeType}`);
  }
}

/**
 * Valida se o arquivo é um documento suportado
 */
export function isSupportedDocumentType(mimeType: string): boolean {
  const supportedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
  ];
  return supportedTypes.includes(mimeType);
}

/**
 * Obtém a extensão de arquivo baseada no MIME type
 */
export function getFileExtension(mimeType: string): string {
  const extensions: Record<string, string> = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      "docx",
    "application/msword": "doc",
  };
  return extensions[mimeType] || "unknown";
}
