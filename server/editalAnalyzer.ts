import Anthropic from "@anthropic-ai/sdk";

export interface DocumentGroup {
  category: string;
  documents: string[];
}

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
  requiredDocuments: string[];         // mantido para compatibilidade
  documentGroups: DocumentGroup[];     // novo: documentos segmentados por categoria
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
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não definida. Adicione-a ao arquivo .env");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export function truncateEditalText(text: string, maxChars = 80_000): string {
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
    return Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  } catch { return -1; }
}

export function hasCriticalDeadlines(deadlines: Array<{ daysUntil: number }>): boolean {
  return deadlines.some((d) => d.daysUntil > 0 && d.daysUntil < 7);
}

function cleanJsonResponse(raw: string): string {
  return raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
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
- NUNCA inclua prazos de execução contratual, vigência do contrato ou duração dos serviços como deadlines
- Se o edital mencionar "prazo de execução de X meses", "vigência de X meses" — coloque como alerta severity "high", NÃO como deadline
- Datas no formato YYYY-MM-DD; daysUntil sempre 0 e isCritical sempre false

SOBRE REQUISITOS (requirements):
- Use o nome EXATO da categoria como está escrito no edital
- Se o edital agrupa "Regularidade Jurídica, Fiscal e Trabalhista" em uma seção, use exatamente esse nome
- Cada categoria pode ter muitos itens — liste TODOS

SOBRE DOCUMENTOS SEGMENTADOS (documentGroups):
- Este é o campo mais importante — extraia os documentos organizados nas categorias EXATAS do edital
- Identifique cada grupo/seção de documentos que o edital solicita e mantenha a ORDEM ORIGINAL do edital
- Exemplos de categorias comuns (use o nome exato do edital, não esses exemplos):
  * "Documentos de Habilitação Jurídica"
  * "Documentos de Regularidade Fiscal e Trabalhista"
  * "Documentos de Qualificação Econômico-Financeira"
  * "Documentos de Qualificação Técnica"
  * "Documentos da Proposta Técnica"
  * "Documentos da Proposta de Preços"
- Para cada categoria, liste TODOS os documentos com seus nomes COMPLETOS e EXATOS
- NUNCA abrevie nomes de documentos (ex: ERRADO "Cadastro Estadual" — CORRETO "Cadastro de Contribuinte Estadual ou Municipal")
- Se um documento tiver subinformações (ex: prazo de validade, número de vias), inclua no nome

SOBRE DOCUMENTOS (requiredDocuments):
- Preencha com a lista plana de TODOS os documentos (concatenação de todos os grupos)
- Mesmas regras de fidelidade ao nome exato

SOBRE CRITÉRIOS DE SELEÇÃO:
- Liste todos com pesos percentuais exatos se mencionados

REGRAS GERAIS:
- Não invente — retorne array vazio se não encontrar
- title = título/número oficial exato
- organization = nome completo do órgão`;

  const userPrompt = `Analise o edital abaixo e retorne APENAS o JSON, sem markdown.
Use os nomes exatos de categorias e documentos conforme aparecem no edital, na ordem original.

EDITAL:
${textToAnalyze}

Retorne APENAS este JSON:
{
  "title": "título/número exato do edital",
  "organization": "nome completo do órgão",
  "summary": "2 frases descrevendo objeto e valor estimado se houver",
  "deadlines": [
    { "name": "nome exato do prazo", "date": "YYYY-MM-DD", "daysUntil": 0, "isCritical": false }
  ],
  "requirements": [
    { "category": "nome exato da categoria no edital", "items": ["requisito completo"] }
  ],
  "selectionCriteria": [
    { "criterion": "nome do critério", "weight": 0, "description": "descrição completa" }
  ],
  "documentGroups": [
    {
      "category": "nome exato da seção de documentos no edital (ex: Documentos da Proposta Técnica)",
      "documents": ["nome completo e exato do documento conforme o edital"]
    }
  ],
  "requiredDocuments": ["lista plana de todos os documentos — mesmos do documentGroups concatenados"],
  "penalties": [
    { "violation": "descrição da infração", "penalty": "sanção aplicada" }
  ],
  "alerts": [
    { "severity": "high", "message": "descrição do alerta", "category": "categoria" }
  ]
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001", // ~$0,02 por análise de edital médio
    max_tokens: 6000, // reduzido para economizar — suficiente para análise completa
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawContent = response.content[0];
  if (!rawContent || rawContent.type !== "text") throw new Error("Resposta inesperada da API Anthropic");

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
    return { name: d.name ?? "", date: d.date ?? "", daysUntil, isCritical: daysUntil > 0 && daysUntil < 7 };
  });

  // Se documentGroups não veio, gera a partir de requiredDocuments para compatibilidade
  const documentGroups: DocumentGroup[] = parsed.documentGroups?.length
    ? parsed.documentGroups
    : parsed.requiredDocuments?.length
    ? [{ category: "Documentos Exigidos", documents: parsed.requiredDocuments }]
    : [];

  return {
    title: parsed.title ?? "",
    organization: parsed.organization ?? "",
    summary: parsed.summary ?? "",
    deadlines,
    requirements: parsed.requirements ?? [],
    selectionCriteria: parsed.selectionCriteria ?? [],
    requiredDocuments: parsed.requiredDocuments ?? [],
    documentGroups,
    penalties: parsed.penalties ?? [],
    alerts: parsed.alerts ?? [],
    hasCriticalDeadline: hasCriticalDeadlines(deadlines),
  };
}