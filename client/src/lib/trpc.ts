// Cliente tRPC que injeta o token Firebase no header Authorization
import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";
import { getAuth } from "firebase/auth";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        transformer: superjson,
        async headers() {
          const auth = getAuth();
          const user = auth.currentUser;
          if (!user) return {};
          try {
            const token = await user.getIdToken();
            return { Authorization: `Bearer ${token}` };
          } catch {
            return {};
          }
        },
      }),
    ],
  });
}