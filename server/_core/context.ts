// server/_core/context.ts
// Autenticação via Firebase — verifica o ID token JWT no cookie ou header Authorization
import type { Request, Response } from "express";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getUserByOpenId, upsertUser } from "../db";
import { parse as parseCookieHeader } from "cookie";

// Inicializa o Firebase Admin SDK (lazy, singleton)
function getFirebaseAdmin() {
  if (getApps().length > 0) return getApps()[0]!;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Variáveis de ambiente do Firebase Admin não configuradas: " +
      "FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY"
    );
  }

  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export type TrpcContext = {
  req: Request;
  res: Response;
  user: {
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
    loginMethod: string | null;
    role: "user" | "admin";
    createdAt: Date;
    updatedAt: Date;
    lastSignedIn: Date;
  } | null;
};

export async function createContext(opts: {
  req: Request;
  res: Response;
}): Promise<TrpcContext> {
  try {
    getFirebaseAdmin();
  } catch (e) {
    console.error("[Auth] Firebase Admin não inicializado:", e);
    return { req: opts.req, res: opts.res, user: null };
  }

  // Extrair token do header Authorization ou cookie
  let idToken: string | undefined;

  const authHeader = opts.req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    idToken = authHeader.slice(7);
  } else {
    const cookies = parseCookieHeader(opts.req.headers.cookie ?? "");
    idToken = cookies["firebase_token"];
  }

  if (!idToken) {
    return { req: opts.req, res: opts.res, user: null };
  }

  try {
    const auth = getAuth();
    const decoded = await auth.verifyIdToken(idToken);

    // Buscar ou criar usuário no banco local
    let user = await getUserByOpenId(decoded.uid);

    if (!user) {
      await upsertUser({
        openId: decoded.uid,
        name: decoded.name ?? null,
        email: decoded.email ?? null,
        loginMethod: decoded.firebase.sign_in_provider ?? null,
        lastSignedIn: new Date(),
      });
      user = await getUserByOpenId(decoded.uid);
    } else {
      await upsertUser({
        openId: decoded.uid,
        lastSignedIn: new Date(),
      });
    }

    if (!user) {
      return { req: opts.req, res: opts.res, user: null };
    }

    return { req: opts.req, res: opts.res, user };
  } catch (err) {
    console.warn("[Auth] Token Firebase inválido:", err);
    return { req: opts.req, res: opts.res, user: null };
  }
}