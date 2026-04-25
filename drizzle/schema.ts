import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Tabela de editais analisados
 */
export const editals = mysqlTable("editals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  fileSize: int("fileSize").notNull(),
  title: text("title"),
  organization: text("organization"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Edital = typeof editals.$inferSelect;
export type InsertEdital = typeof editals.$inferInsert;

/**
 * Tabela de análises estruturadas de editais
 */
export const editalAnalyses = mysqlTable("editalAnalyses", {
  id: int("id").autoincrement().primaryKey(),
  editalId: int("editalId").notNull(),
  userId: int("userId").notNull(),
  // Informações estruturadas extraídas
  summary: text("summary"),
  deadlines: json("deadlines").$type<Array<{
    name: string;
    date: string;
    daysUntil: number;
    isCritical: boolean;
  }>>(),
  requirements: json("requirements").$type<Array<{
    category: string;
    items: string[];
  }>>(),
  selectionCriteria: json("selectionCriteria").$type<Array<{
    criterion: string;
    weight?: number;
    description: string;
  }>>(),
  requiredDocuments: json("requiredDocuments").$type<string[]>(),
  penalties: json("penalties").$type<Array<{
    violation: string;
    penalty: string;
  }>>(),
  alerts: json("alerts").$type<Array<{
    severity: "high" | "medium" | "low";
    message: string;
    category: string;
  }>>(),
  hasCriticalDeadline: boolean("hasCriticalDeadline").default(false).notNull(),
  notificationSent: boolean("notificationSent").default(false).notNull(),
  rawText: text("rawText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EditalAnalysis = typeof editalAnalyses.$inferSelect;
export type InsertEditalAnalysis = typeof editalAnalyses.$inferInsert;

/**
 * Relações entre tabelas
 */
export const usersRelations = relations(users, ({ many }) => ({
  editals: many(editals),
  analyses: many(editalAnalyses),
}));

export const editalsRelations = relations(editals, ({ one, many }) => ({
  user: one(users, { fields: [editals.userId], references: [users.id] }),
  analyses: many(editalAnalyses),
}));

export const editalAnalysesRelations = relations(editalAnalyses, ({ one }) => ({
  user: one(users, { fields: [editalAnalyses.userId], references: [users.id] }),
  edital: one(editals, { fields: [editalAnalyses.editalId], references: [editals.id] }),
}));