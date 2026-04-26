export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  const user: User = {
    id: 1,
    openId: "dev-user",
    name: "Dev User",
    email: null,
    loginMethod: null,
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}