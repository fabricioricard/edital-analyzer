import Anthropic from "@anthropic-ai/sdk";

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

export function hasCriticalDeadlines(deadlines: Array<{ daysUntil: number }>): boolean {
  return deadlines.some((d) => d.daysUntil > 0 && d.daysUntil < 7);
}

function cleanJsonResponse(raw: string): string {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export async function analyzeEdital(editalText: string): Promise<EditalAnalysisResult> {
  const client = getAnthropicClient();
  const textToAnalyze = truncateEditalText(editalText);

  const systemPrompt = `Você é um especialista em editais públicos brasileiros — licitações, chamamentos públicos, concursos e pregões. Conhece profundamente a Lei 14.133/2021 (Nova Lei de Licitações), Lei 8.666/93 e normativas relacionadas.

Sua tarefa é extrair informações críticas de editais com máxima fidelidade ao texto original.
Retorne APENAS um objeto JSON válido, sem explicações ou blocos de markdown.

REGRAS CRÍTICAS — siga todas sem exceção:

SOBRE PRAZOS (deadlines):
- Inclua APENAS datas de encerramento/limite para ações do processo licitatório (ex: prazo para entrega de propostas, data da sessão pública, prazo para recursos, prazo para impugnação)
- NUNCA inclua prazos de execução contratual, vigência do contrato ou duração dos serviços como entradas em deadlines
- Se o edital mencionar "prazo de execução de X meses", "vigência de X meses", "duração de X dias" — coloque isso como alerta com severity "high", NÃO como deadline
- Datas devem estar no formato YYYY-MM-DD; daysUntil sempre 0 e isCritical sempre false

SOBRE REQUISITOS (requirements):
- Use o nome EXATO da categoria como está escrito no edital
- Se o edital agrupa "Regularidade Jurídica, Fiscal e Trabalhista" em uma seção, use exatamente esse nome — NÃO divida em categorias separadas
- Se o edital tiver seções separadas, mantenha separadas
- Cada categoria pode ter muitos itens — liste TODOS, sem omitir nenhum

SOBRE DOCUMENTOS (requiredDocuments):
- Preserve o nome COMPLETO e EXATO de cada documento como escrito no edital — palavra por palavra
- NUNCA abrevie, parafraseie ou omita palavras do nome do documento
- Exemplos de erros a evitar:
  * ERRADO: "Cadastro Estadual ou Municipal" — CORRETO: "Cadastro de Contribuinte Estadual ou Municipal"
  * ERRADO: "Certidão Negativa Federal" — CORRETO: "Certidão Negativa de Débitos relativos a Créditos Tributários Federais e à Dívida Ativa da União"
- Em caso de dúvida, copie o nome do documento diretamente do texto do edital

SOBRE CRITÉRIOS DE SELEÇÃO:
- Liste todos os critérios com seus pesos percentuais exatos se mencionados no edital

REGRAS GERAIS:
- Não invente informações — retorne array vazio se não encontrar
- title = título/número oficial do edital exatamente como escrito
- organization = nome completo do órgão/entidade responsável`;

  const userPrompt = `Analise o edital abaixo e retorne APENAS o JSON, sem markdown.
Seja fiel ao texto original: use os nomes exatos de categorias e documentos conforme aparecem no edital.

EDITAL:
${textToAnalyze}

Retorne APENAS este JSON:
{
  "title": "título/número exato do edital",
  "organization": "nome completo do órgão",
  "summary": "2 frases descrevendo objeto e valor estimado se houver",
  "deadlines": [
    { "name": "nome exato do prazo (ex: Prazo para entrega de propostas)", "date": "YYYY-MM-DD", "daysUntil": 0, "isCritical": false }
  ],
  "requirements": [
    { "category": "nome exato da categoria no edital", "items": ["requisito completo sem abreviação"] }
  ],
  "selectionCriteria": [
    { "criterion": "nome do critério", "weight": 0, "description": "descrição completa" }
  ],
  "requiredDocuments": ["nome completo e exato do documento sem abreviações"],
  "penalties": [
    { "violation": "descrição da infração", "penalty": "sanção aplicada" }
  ],
  "alerts": [
    { "severity": "high", "message": "ex: Prazo de execução dos serviços: 20 meses consecutivos", "category": "Prazo de Execução" }
  ]
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawContent = response.content[0];
  if (!rawContent || rawContent.type !== "text") {
    throw new Error("Resposta inesperada da API Anthropic");
  }

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