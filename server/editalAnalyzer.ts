import Anthropic from "@anthropic-ai/sdk";

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentGroup {
  category: string;
  documents: string[];
  ref?: string; // pág. X, pgfo. Y
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
    ref?: string;
  }>;
  requirements: Array<{
    category: string;
    items: string[];
    ref?: string;
  }>;
  selectionCriteria: Array<{
    criterion: string;
    weight?: number;
    description: string;
    ref?: string;
  }>;
  requiredDocuments: string[];
  documentGroups: DocumentGroup[];
  penalties: Array<{
    violation: string;
    penalty: string;
    ref?: string;
  }>;
  alerts: Array<{
    severity: "high" | "medium" | "low";
    message: string;
    category: string;
    ref?: string;
  }>;
  hasCriticalDeadline: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

// ~120k chars por chunk ≈ 30k tokens de input — bom equilíbrio custo/qualidade
const CHUNK_SIZE = 120_000;
// Sobreposição entre chunks para não perder informações na divisão
const CHUNK_OVERLAP = 10_000;

// ─────────────────────────────────────────────────────────────────────────────
// Cliente
// ─────────────────────────────────────────────────────────────────────────────

let _client: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY não definida.");
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilitários
// ─────────────────────────────────────────────────────────────────────────────

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

/**
 * Divide o texto em chunks com sobreposição para não perder informações
 * entre divisões.
 */
function splitIntoChunks(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];

  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + CHUNK_SIZE, text.length);

    // Tenta quebrar em parágrafo para não cortar no meio de uma frase
    let breakPoint = end;
    if (end < text.length) {
      const lastNewline = text.lastIndexOf("\n", end);
      if (lastNewline > start + CHUNK_SIZE * 0.8) {
        breakPoint = lastNewline;
      }
    }

    chunks.push(text.slice(start, breakPoint));
    start = breakPoint - CHUNK_OVERLAP; // sobreposição
    if (start < 0) start = 0;
  }

  console.log(`[editalAnalyzer] Documento dividido em ${chunks.length} chunks`);
  return chunks;
}

/**
 * Combina resultados de múltiplos chunks removendo duplicatas.
 */
function mergeResults(results: EditalAnalysisResult[]): EditalAnalysisResult {
  if (results.length === 1) return results[0];

  // Usa o primeiro chunk para título e organização (geralmente na capa)
  const base = results[0];

  // Merge de arrays removendo duplicatas por nome/texto
  const mergeByName = <T extends { name?: string; criterion?: string; violation?: string; message?: string }>(
    arrays: T[][]
  ): T[] => {
    const seen = new Set<string>();
    const merged: T[] = [];
    for (const arr of arrays) {
      for (const item of arr) {
        const key = item.name || item.criterion || item.violation || item.message || JSON.stringify(item);
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(item);
        }
      }
    }
    return merged;
  };

  const mergeDocGroups = (arrays: DocumentGroup[][]): DocumentGroup[] => {
    const map = new Map<string, Set<string>>();
    for (const arr of arrays) {
      for (const group of arr) {
        if (!map.has(group.category)) map.set(group.category, new Set());
        group.documents.forEach((d) => map.get(group.category)!.add(d));
      }
    }
    return Array.from(map.entries()).map(([category, docs]) => ({
      category,
      documents: Array.from(docs),
    }));
  };

  const mergeRequirements = (arrays: Array<{ category: string; items: string[]; ref?: string }>[]) => {
    const map = new Map<string, Set<string>>();
    const refs = new Map<string, string>();
    for (const arr of arrays) {
      for (const req of arr) {
        if (!map.has(req.category)) map.set(req.category, new Set());
        req.items.forEach((i) => map.get(req.category)!.add(i));
        if (req.ref) refs.set(req.category, req.ref);
      }
    }
    return Array.from(map.entries()).map(([category, items]) => ({
      category,
      items: Array.from(items),
      ref: refs.get(category),
    }));
  };

  const allDocs = Array.from(
    new Set(results.flatMap((r) => r.requiredDocuments))
  );

  return {
    title: base.title,
    organization: base.organization,
    summary: base.summary,
    deadlines: mergeByName(results.map((r) => r.deadlines)),
    requirements: mergeRequirements(results.map((r) => r.requirements)),
    selectionCriteria: mergeByName(results.map((r) => r.selectionCriteria)),
    requiredDocuments: allDocs,
    documentGroups: mergeDocGroups(results.map((r) => r.documentGroups)),
    penalties: mergeByName(results.map((r) => r.penalties)),
    alerts: mergeByName(results.map((r) => r.alerts)),
    hasCriticalDeadline: results.some((r) => r.hasCriticalDeadline),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Análise de um chunk
// ─────────────────────────────────────────────────────────────────────────────

async function analyzeChunk(
  client: Anthropic,
  chunk: string,
  chunkIndex: number,
  totalChunks: number
): Promise<EditalAnalysisResult> {
  const isFirstChunk = chunkIndex === 0;
  const chunkNote = totalChunks > 1
    ? `\n\nNOTA: Este é o trecho ${chunkIndex + 1} de ${totalChunks} do documento. Extraia apenas as informações presentes NESTE trecho.`
    : "";

  const systemPrompt = `Você é um especialista em editais públicos brasileiros — licitações, chamamentos públicos, concursos e pregões. Conhece profundamente a Lei 14.133/2021 e Lei 8.666/93.

Sua tarefa é extrair informações críticas com máxima fidelidade ao texto original.
Retorne APENAS um objeto JSON válido, sem explicações ou markdown.

REGRAS CRÍTICAS:

SOBRE REFERÊNCIAS (campo "ref"):
- Para CADA item extraído, identifique a localização no documento no formato: "pág. X, pgfo. Y"
- Se não conseguir identificar a página exata, use o número aproximado
- Se não houver parágrafo numerado, omita o pgfo.
- Exemplos: "pág. 15, pgfo. 3" ou "pág. 8"
- Para grupos de documentos, cite a página onde começa a seção

SOBRE PRAZOS (deadlines):
- APENAS datas limite de ações do processo (entrega de propostas, sessão pública, recursos)
- NUNCA coloque prazos de execução/vigência contratual como deadlines — vão nos alerts
- Datas no formato YYYY-MM-DD; daysUntil sempre 0; isCritical sempre false

SOBRE DOCUMENTOS (documentGroups):
Este é o campo mais importante. Siga rigorosamente:

ESTRUTURA OBRIGATÓRIA — dois grandes blocos na seguinte ordem:

BLOCO 1 — PROPOSTA (se houver):
- Identifique os documentos exigidos para a proposta e crie subgrupos separados:
  * "Proposta de Preços" (ou o nome exato usado no edital)
  * "Proposta Técnica" (apenas se o edital exigir — não invente)
  * Outros subgrupos de proposta que o edital definir
- Cada subgrupo deve listar TODOS os documentos exigidos naquela seção

BLOCO 2 — HABILITAÇÃO (sempre presente em licitações):
- Identifique cada subcategoria de habilitação com o nome EXATO do edital. Exemplos comuns (mas use sempre o termo do edital):
  * "Habilitação Jurídica" ou "Regularidade Jurídica"
  * "Regularidade Fiscal e Trabalhista" ou "Regularidade Fiscal" ou "Habilitação Fiscal"
  * "Qualificação Econômico-Financeira" ou "Qualificação Econômica"
  * "Qualificação Técnica" ou "Habilitação Técnica"
  * Outros subgrupos que o edital definir
- Cada subcategoria deve listar TODOS os documentos exigidos

REGRAS PARA DOCUMENTOS:
- Mantenha a ordem EXATA em que aparecem no edital dentro de cada subgrupo
- Preserve o nome COMPLETO e EXATO de cada documento — palavra por palavra
- NUNCA abrevie: ERRADO "Cadastro Estadual" → CORRETO "Cadastro de Contribuinte Estadual ou Municipal"
- NUNCA abrevie: ERRADO "Certidão Negativa Federal" → CORRETO "Certidão Negativa de Débitos relativos a Créditos Tributários Federais e à Dívida Ativa da União"
- Se um documento tiver condições (ex: "com prazo de validade de 90 dias"), inclua no nome
- Se não houver seção de Proposta no edital, omita o Bloco 1

SOBRE REQUISITOS:
- Use o nome exato da categoria — não divida o que está junto no edital

GERAL:
- Não invente — array vazio se não encontrar neste trecho
- Se este for um trecho parcial, capture apenas o que está presente`;

  const userPrompt = `Analise o trecho de edital abaixo e retorne APENAS o JSON:${chunkNote}

TRECHO DO EDITAL:
${chunk}

JSON:
{
  "title": "${isFirstChunk ? 'título/número exato' : ''}",
  "organization": "${isFirstChunk ? 'nome completo do órgão' : ''}",
  "summary": "${isFirstChunk ? '2 frases sobre objeto e valor' : ''}",
  "deadlines": [
    { "name": "nome exato", "date": "YYYY-MM-DD", "daysUntil": 0, "isCritical": false, "ref": "pág. X, pgfo. Y" }
  ],
  "requirements": [
    { "category": "nome exato da categoria", "items": ["requisito completo"], "ref": "pág. X, pgfo. Y" }
  ],
  "selectionCriteria": [
    { "criterion": "nome", "weight": 0, "description": "descrição", "ref": "pág. X, pgfo. Y" }
  ],
  "documentGroups": [
    { "category": "nome exato da seção", "documents": ["nome completo do documento"], "ref": "pág. X" }
  ],
  "requiredDocuments": ["lista plana de todos os documentos deste trecho"],
  "penalties": [
    { "violation": "infração", "penalty": "sanção", "ref": "pág. X, pgfo. Y" }
  ],
  "alerts": [
    { "severity": "high", "message": "descrição", "category": "categoria", "ref": "pág. X, pgfo. Y" }
  ]
}`;

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 6000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const rawContent = response.content[0];
  if (!rawContent || rawContent.type !== "text") throw new Error("Resposta inesperada da API");

  let rawText = rawContent.text;
  if (response.stop_reason === "max_tokens") {
    console.warn(`[editalAnalyzer] Chunk ${chunkIndex + 1} truncado — recuperando JSON`);
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
    console.error(`[editalAnalyzer] JSON inválido no chunk ${chunkIndex + 1}:`, cleaned.slice(0, 200));
    // Retorna resultado vazio em vez de quebrar tudo
    parsed = {};
  }

  const deadlines = (parsed.deadlines ?? []).map((d: any) => {
    const daysUntil = calculateDaysUntil(d.date);
    return { name: d.name ?? "", date: d.date ?? "", daysUntil, isCritical: daysUntil > 0 && daysUntil < 7, ref: d.ref };
  });

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

// ─────────────────────────────────────────────────────────────────────────────
// Função principal
// ─────────────────────────────────────────────────────────────────────────────

export async function analyzeEdital(editalText: string): Promise<EditalAnalysisResult> {
  const client = getAnthropicClient();
  const chunks = splitIntoChunks(editalText);

  console.log(`[editalAnalyzer] Analisando ${chunks.length} chunk(s) | total: ${editalText.length} chars`);

  const results: EditalAnalysisResult[] = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`[editalAnalyzer] Chunk ${i + 1}/${chunks.length}...`);
    const result = await analyzeChunk(client, chunks[i], i, chunks.length);
    results.push(result);
  }

  return mergeResults(results);
}