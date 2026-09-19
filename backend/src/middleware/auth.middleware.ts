import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import { auth } from "../auth";
import { AuthenticationError, AuthorizationError } from "../utils/errors";

export type AuthContext = {
  userId: string;
  sessionId: string;
  isAnonymous: boolean;
  name: string | null;
  email: string | null;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

async function resolveSession(req: Request) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });
  if (!session?.user || !session.session) return null;
  const user = session.user as typeof session.user & { role?: string };
  return {
    userId: session.user.id,
    sessionId: session.session.id,
    isAnonymous: Boolean(session.user.isAnonymous),
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    role: user.role ?? "user",
  };
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const ctx = await resolveSession(req);
    if (!ctx) {
      throw new AuthenticationError();
    }
    req.auth = ctx;
    next();
  } catch (e) {
    next(e);
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    req.auth = (await resolveSession(req)) ?? undefined;
    next();
  } catch {
    next();
  }
}

export async function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  try {
    const ctx = await resolveSession(req);
    if (!ctx) {
      throw new AuthenticationError();
    }
    if (ctx.isAnonymous) {
      throw new AuthorizationError("Admin access required");
    }
    if (ctx.role !== "admin") {
      throw new AuthorizationError("Admin access required");
    }
    req.auth = ctx;
    next();
  } catch (e) {
    next(e);
  }
}
