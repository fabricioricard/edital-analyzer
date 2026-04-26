import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { extractTextFromDocument, isSupportedDocumentType } from "./documentProcessor";
import { analyzeEdital } from "./editalAnalyzer";
import {
  createEdital,
  createEditalAnalysis,
  getEditalsByUserId,
  getAnalysisByEditalId,
} from "./db";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  editals: router({
    upload: protectedProcedure
      .input(
        z.object({
          fileName: z.string().min(1).max(255),
          fileBuffer: z
            .instanceof(Buffer)
            .or(z.instanceof(Uint8Array))
            .transform((v) => Buffer.from(v)),
          mimeType: z.string(),
          fileSize: z.number().max(MAX_FILE_SIZE, "Arquivo muito grande (máx 50MB)"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!isSupportedDocumentType(input.mimeType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Tipo de arquivo não suportado. Use PDF ou DOCX.",
          });
        }

        if (input.fileBuffer.length > MAX_FILE_SIZE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Arquivo muito grande (máx 50MB).",
          });
        }

        // ── Etapa 1: Extrair texto ─────────────────────────────────────────
        let text: string;
        try {
          console.log("[upload] ETAPA 1 — extraindo texto | mime:", input.mimeType, "| bytes:", input.fileBuffer.length);
          text = await extractTextFromDocument(input.fileBuffer, input.mimeType);
          console.log("[upload] ETAPA 1 OK — chars extraídos:", text.length);
        } catch (err) {
          console.error("[upload] ETAPA 1 FALHOU:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao extrair texto do documento." });
        }

        if (!text || text.trim().length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não foi possível extrair texto do documento. Verifique se o arquivo não está corrompido ou é apenas uma imagem escaneada.",
          });
        }

        // ── Etapa 2: Análise via Anthropic ────────────────────────────────
        let analysis: Awaited<ReturnType<typeof analyzeEdital>>;
        try {
          console.log("[upload] ETAPA 2 — chamando API Anthropic...");
          analysis = await analyzeEdital(text);
          console.log("[upload] ETAPA 2 OK — hasCritical:", analysis.hasCriticalDeadline, "| deadlines:", analysis.deadlines.length);
        } catch (err) {
          console.error("[upload] ETAPA 2 FALHOU:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao analisar o edital com IA." });
        }

        // ── Etapa 3: Criar registro do edital ─────────────────────────────
        let edital: Awaited<ReturnType<typeof createEdital>>;
        try {
          console.log("[upload] ETAPA 3 — criando registro no banco...");
          edital = await createEdital({
            userId: ctx.user.id,
            fileName: input.fileName,
            fileKey: "",
            fileUrl: "",
            mimeType: input.mimeType,
            fileSize: input.fileSize,
            title: analysis.title || undefined,
            organization: analysis.organization || undefined,
          });
          console.log("[upload] ETAPA 3 OK — edital id:", edital?.id);
        } catch (err) {
          console.error("[upload] ETAPA 3 FALHOU:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao registrar o edital no banco de dados." });
        }

        if (!edital) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao registrar o edital no banco de dados." });
        }

        // ── Etapa 4: Persistir análise ────────────────────────────────────
        let analysisRecord: Awaited<ReturnType<typeof createEditalAnalysis>>;
        try {
          console.log("[upload] ETAPA 4 — salvando análise no banco...");
          analysisRecord = await createEditalAnalysis({
            editalId: edital.id,
            userId: ctx.user.id,
            summary: analysis.summary,
            deadlines: analysis.deadlines as any,
            requirements: analysis.requirements as any,
            selectionCriteria: analysis.selectionCriteria as any,
            requiredDocuments: analysis.requiredDocuments,
            penalties: analysis.penalties as any,
            alerts: analysis.alerts as any,
            hasCriticalDeadline: analysis.hasCriticalDeadline,
            // rawText omitido — texto muito grande para salvar no banco
          });
          console.log("[upload] ETAPA 4 OK — analysis id:", analysisRecord?.id);
        } catch (err) {
          console.error("[upload] ETAPA 4 FALHOU:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao salvar a análise no banco de dados." });
        }

        if (!analysisRecord) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao salvar a análise no banco de dados." });
        }

        console.log("[upload] CONCLUÍDO com sucesso.");
        return { edital, analysis: analysisRecord };
      }),

    list: protectedProcedure
      .input(
        z.object({
          page: z.number().int().positive().default(1),
          pageSize: z.number().int().min(1).max(100).default(20),
        }).optional()
      )
      .query(async ({ ctx, input }) => {
        const page = input?.page ?? 1;
        const pageSize = input?.pageSize ?? 20;
        try {
          return await getEditalsByUserId(ctx.user.id, pageSize, (page - 1) * pageSize);
        } catch (error) {
          console.error("[routers] Erro ao listar editais:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao listar editais." });
        }
      }),

    getAnalysis: protectedProcedure
      .input(z.object({ editalId: z.number().int().positive() }))
      .query(async ({ ctx, input }) => {
        try {
          const analysis = await getAnalysisByEditalId(input.editalId);

          if (!analysis) return null;

          if (analysis.userId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Você não tem permissão para visualizar esta análise.",
            });
          }

          return analysis;
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("[routers] Erro ao buscar análise:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao buscar a análise." });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;