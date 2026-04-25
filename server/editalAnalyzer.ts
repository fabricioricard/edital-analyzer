import { invokeLLM } from "./_core/llm";

export interface EditalAnalysisResult {
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

/**
 * Analisa o texto de um edital e extrai informações estruturadas
 */
export async function analyzeEdital(
  editalText: string
): Promise<EditalAnalysisResult> {
  const systemPrompt = `Você é um especialista em análise de editais e chamadas públicas. 
Sua tarefa é extrair informações críticas de editais de forma estruturada e precisa.
Retorne APENAS um objeto JSON válido, sem explicações adicionais.
Identifique prazos críticos como aqueles com menos de 7 dias até o encerramento.
Seja minucioso e não deixe escapar nenhuma informação importante.`;

  const userPrompt = `Analise o seguinte edital e extraia as informações em formato JSON estruturado:

${editalText}

Retorne um JSON com a seguinte estrutura:
{
  "summary": "Resumo executivo do edital (2-3 frases)",
  "deadlines": [
    {
      "name": "Nome do prazo",
      "date": "Data no formato YYYY-MM-DD",
      "daysUntil": número de dias até a data,
      "isCritical": true/false (true se menos de 7 dias)
    }
  ],
  "requirements": [
    {
      "category": "Categoria de requisitos",
      "items": ["requisito 1", "requisito 2"]
    }
  ],
  "selectionCriteria": [
    {
      "criterion": "Nome do critério",
      "weight": número opcional (0-100),
      "description": "Descrição do critério"
    }
  ],
  "requiredDocuments": ["documento 1", "documento 2"],
  "penalties": [
    {
      "violation": "Tipo de violação",
      "penalty": "Penalidade aplicada"
    }
  ],
  "alerts": [
    {
      "severity": "high|medium|low",
      "message": "Mensagem de alerta",
      "category": "Categoria do alerta"
    }
  ]
}

Importante:
- Extraia TODAS as datas mencionadas no edital
- Identifique prazos críticos (< 7 dias)
- Liste todos os requisitos e documentos exigidos
- Destaque qualquer informação importante ou incomum como alerta
- Use datas reais do edital, não datas atuais
- Se não conseguir determinar uma data exata, use a informação disponível`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "edital_analysis",
          strict: true,
          schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              deadlines: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    date: { type: "string" },
                    daysUntil: { type: "number" },
                    isCritical: { type: "boolean" },
                  },
                  required: ["name", "date", "daysUntil", "isCritical"],
                  additionalProperties: false,
                },
              },
              requirements: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    items: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                  required: ["category", "items"],
                  additionalProperties: false,
                },
              },
              selectionCriteria: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    criterion: { type: "string" },
                    weight: { type: "number" },
                    description: { type: "string" },
                  },
                  required: ["criterion", "description"],
                  additionalProperties: false,
                },
              },
              requiredDocuments: {
                type: "array",
                items: { type: "string" },
              },
              penalties: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    violation: { type: "string" },
                    penalty: { type: "string" },
                  },
                  required: ["violation", "penalty"],
                  additionalProperties: false,
                },
              },
              alerts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    severity: {
                      type: "string",
                      enum: ["high", "medium", "low"],
                    },
                    message: { type: "string" },
                    category: { type: "string" },
                  },
                  required: ["severity", "message", "category"],
                  additionalProperties: false,
                },
              },
            },
            required: [
              "summary",
              "deadlines",
              "requirements",
              "selectionCriteria",
              "requiredDocuments",
              "penalties",
              "alerts",
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message.content;
    if (!content) {
      throw new Error("No content returned from LLM");
    }

    const contentStr = typeof content === "string" ? content : JSON.stringify(content);
    const parsed = JSON.parse(contentStr);

    // Validar que temos os campos necessários
    const hasCriticalDeadline = parsed.deadlines?.some(
      (d: any) => d.isCritical === true
    );

    return {
      ...parsed,
      hasCriticalDeadline: hasCriticalDeadline || false,
    } as EditalAnalysisResult;
  } catch (error) {
    console.error("Error analyzing edital:", error);
    throw new Error("Failed to analyze edital with LLM");
  }
}

/**
 * Calcula dias até uma data específica
 */
export function calculateDaysUntil(dateString: string): number {
  try {
    const targetDate = new Date(dateString);
    
    // Verificar se a data é válida
    if (isNaN(targetDate.getTime())) {
      return -1;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  } catch {
    return -1;
  }
}

/**
 * Verifica se há prazos críticos (< 7 dias)
 */
export function hasCriticalDeadlines(
  deadlines: Array<{ daysUntil: number }>
): boolean {
  return deadlines.some((d) => d.daysUntil > 0 && d.daysUntil < 7);
}
