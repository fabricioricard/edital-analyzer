import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { storagePut } from "./storage";
import { extractTextFromDocument, isSupportedDocumentType } from "./documentProcessor";
import { analyzeEdital } from "./editalAnalyzer";
import {
  createEdital,
  createEditalAnalysis,
  getEditalsByUserId,
  getAnalysisByEditalId,
} from "./db";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  editals: router({
    upload: protectedProcedure
      .input(
        z.object({
          fileName: z.string(),
          fileBuffer: z.instanceof(Buffer),
          mimeType: z.string(),
          fileSize: z.number(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!isSupportedDocumentType(input.mimeType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Unsupported document type",
          });
        }

        try {
          // Extrair texto do documento
          const text = await extractTextFromDocument(
            input.fileBuffer,
            input.mimeType
          );

          // Armazenar arquivo no S3
          const { key, url } = await storagePut(
            `editals/${ctx.user.id}/${Date.now()}-${input.fileName}`,
            input.fileBuffer,
            input.mimeType
          );

          // Criar registro do edital
          const edital = await createEdital({
            userId: ctx.user.id,
            fileName: input.fileName,
            fileKey: key,
            fileUrl: url,
            mimeType: input.mimeType,
            fileSize: input.fileSize,
          });

          if (!edital) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create edital record",
            });
          }

          // Analisar edital com LLM
          const analysis = await analyzeEdital(text);

          // Criar registro de análise
          const analysisRecord = await createEditalAnalysis({
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
            rawText: text,
          });

          if (!analysisRecord) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create analysis record",
            });
          }

          // Enviar notificação se houver prazos críticos
          if (analysis.hasCriticalDeadline) {
            const criticalDeadlines = analysis.deadlines
              .filter((d) => d.isCritical)
              .map((d) => `${d.name} (${d.date})`)
              .join(", ");

            await notifyOwner({
              title: "Alerta: Edital com Prazos Críticos",
              content: `O edital "${edital.fileName}" contém prazos críticos (menos de 7 dias): ${criticalDeadlines}`,
            });
          }

          return {
            edital,
            analysis: analysisRecord,
          };
        } catch (error) {
          console.error("Error processing edital:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to process edital",
          });
        }
      }),

    list: protectedProcedure.query(async ({ ctx }) => {
      try {
        const editals = await getEditalsByUserId(ctx.user.id);
        return editals;
      } catch (error) {
        console.error("Error listing editals:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list editals",
        });
      }
    }),

    getAnalysis: protectedProcedure
      .input(z.object({ editalId: z.number() }))
      .query(async ({ ctx, input }) => {
        try {
          const analysis = await getAnalysisByEditalId(input.editalId);
          
          if (analysis && analysis.userId !== ctx.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You do not have permission to view this analysis",
            });
          }
          
          return analysis;
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          console.error("Error getting analysis:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to get analysis",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
