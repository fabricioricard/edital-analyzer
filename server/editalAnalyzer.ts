import Anthropic from "@anthropic-ai/sdk";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface EditalAnalysisResult {
  title: string;
  organization: string;
  summary: string;
  deadlines: Array<{
    name: string;
    date: string;
    daysUntil: number;
    isCritical: boolean;
  }>;
  requirements: Array<{
    category: string;
    items: string[];
  }>;
  selectionCriteria: Array<{
    criterion: string;
    weight?: number;
    description: string;
  }>;
  requiredDocuments: string[];
  penalties: Array<{
    violation: string;
    penalty: string;
  }>;
  alerts: Array<{
    severity: "high" | "medium" | "low";
    message: string;
    category: string;
  }>;
  hasCriticalDeadline: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cliente Anthropic (lazy, singleton)
// ─────────────────────────────────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY não definida. Adicione-a ao arquivo .env");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Funções utilitárias (puras — fáceis de testar)
// ─────────────────────────────────────────────────────────────────────────────

export function truncateEditalText(text: string, maxChars = 400_000): string {
  if (text.length <= maxChars) return text;

  const startChars = Math.floor(maxChars * 0.7);
  const endChars = maxChars - startChars;

  console.log(`[editalAnalyzer] Texto truncado: ${text.length} → ${maxChars} chars`);

  return (
    text.slice(0, startChars) +
    "\n\n[... TRECHO OMITIDO — DOCUMENTO MUITO LONGO ...]\n\n" +
    text.slice(-endChars)
  );
}

export function calculateDaysUntil(dateString: string): number {
  try {
    const targetDate = new Date(dateString);
    if (isNaN(targetDate.getTime())) return -1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffMs = targetDate.getTime() - today.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return -1;
  }
}

export function hasCriticalDeadlines(
  deadlines: Array<{ daysUntil: number }>
): boolean {
  return deadlines.some((d) => d.daysUntil > 0 && d.daysUntil < 7);
}

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Análise principal
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeEdital(
  editalText: string
): Promise<EditalAnalysisResult> {
  const client = getAnthropicClient();

  const textToAnalyze = truncateEditalText(editalText);

  const systemPrompt = `Você é um especialista em editais públicos brasileiros — licitações, \
chamamentos públicos, concursos e pregões. Conhece profundamente a Lei 14.133/2021 \
(Nova Lei de Licitações), Lei 8.666/93 e normativas relacionadas.

Sua tarefa é extrair informações críticas de editais com máxima precisão.
Retorne APENAS um objeto JSON válido, sem explicações ou blocos de markdown.

Regras obrigatórias:
- Datas no formato YYYY-MM-DD (ex: "30 de junho de 2025" → "2025-06-30")
- daysUntil sempre 0 e isCritical sempre false — o servidor calculará depois
- Não invente informações — retorne array vazio se não encontrar
- Separe requisitos de habilitação jurídica, fiscal e técnica em categorias distintas
- title = título/número oficial do edital
- organization = nome do órgão/entidade responsável`;

  const userPrompt = `Analise o edital abaixo e retorne APENAS o JSON, sem markdown.
Seja CONCISO: máximo 5 itens por array, resumos curtos (1 frase cada item).

EDITAL:
${textToAnalyze}

JSON esperado:
{
  "title": "",
  "organization": "",
  "summary": "resumo em 2 frases",
  "deadlines": [{ "name": "", "date": "YYYY-MM-DD", "daysUntil": 0, "isCritical": false }],
  "requirements": [{ "category": "", "items": [""] }],
  "selectionCriteria": [{ "criterion": "", "weight": 0, "description": "" }],
  "requiredDocuments": [""],
  "penalties": [{ "violation": "", "penalty": "" }],
  "alerts": [{ "severity": "high", "message": "", "category": "" }]
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001", // ~20x mais barato que Sonnet, ~1.600 análises por $5
    max_tokens: 8192, // máximo suportado pelo Haiku
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawContent = response.content[0];
  if (!rawContent || rawContent.type !== "text") {
    throw new Error("Resposta inesperada da API Anthropic");
  }

  // Se o modelo parou por max_tokens, tenta fechar o JSON incompleto
  let rawText = rawContent.text;
  if (response.stop_reason === "max_tokens") {
    console.warn("[editalAnalyzer] Resposta truncada — tentando recuperar JSON");
    const openBraces = (rawText.match(/{/g) || []).length - (rawText.match(/}/g) || []).length;
    const openBrackets = (rawText.match(/\[/g) || []).length - (rawText.match(/]/g) || []).length;
    rawText = rawText.replace(/,\s*$/, "").replace(/[^}\]]*$/, "");
    rawText += "]".repeat(Math.max(0, openBrackets)) + "}".repeat(Math.max(0, openBraces));
  }

  const cleaned = cleanJsonResponse(rawText);

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.error("[editalAnalyzer] JSON inválido recebido:", cleaned.slice(0, 300));
    throw new Error("O modelo retornou JSON inválido. Tente novamente.");
  }

  // Calcular daysUntil e isCritical no servidor (não confiar no LLM)
  const deadlines = (parsed.deadlines ?? []).map((d: any) => {
    const daysUntil = calculateDaysUntil(d.date);
    return {
      name: d.name ?? "",
      date: d.date ?? "",
      daysUntil,
      isCritical: daysUntil > 0 && daysUntil < 7,
    };
  });

  return {
    title: parsed.title ?? "",
    organization: parsed.organization ?? "",
    summary: parsed.summary ?? "",
    deadlines,
    requirements: parsed.requirements ?? [],
    selectionCriteria: parsed.selectionCriteria ?? [],
    requiredDocuments: parsed.requiredDocuments ?? [],
    penalties: parsed.penalties ?? [],
    alerts: parsed.alerts ?? [],
    hasCriticalDeadline: hasCriticalDeadlines(deadlines),
  };
}