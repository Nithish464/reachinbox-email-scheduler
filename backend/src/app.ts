import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import passport from "./config/passport";
import { env } from "./config/env";
import authRoutes from "./routes/authRoutes";
import emailRoutes from "./routes/emailRoutes";

export function createApp() {
  const app = express();

  // Render (and most PaaS) sit behind a reverse proxy - Express needs to
  // trust it to correctly detect HTTPS, which is required for secure
  // cookies to actually get set.
  app.set("trust proxy", 1);

  app.use(express.json({ limit: "2mb" }));
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );

  // With Next.js proxying /api/* through the frontend's own domain (see
  // frontend/next.config.js), the browser now only ever talks to one
  // origin, so this cookie is first-party in both local dev and
  // production - Lax is sufficient and avoids the cross-site cookie
  // blocking modern browsers apply to SameSite=None regardless of
  // Secure. Still mark secure in production since that traffic is HTTPS.
  app.use(
    cookieSession({
      name: "reachinbox.sid",
      keys: [env.SESSION_SECRET],
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: env.NODE_ENV === "production",
    })
  );

  // passport 0.7 calls req.session.regenerate/save which cookie-session
  // doesn't implement - this shim makes them no-ops so it works.
  app.use((req: any, _res, next) => {
    if (req.session && !req.session.regenerate) {
      req.session.regenerate = (cb: any) => cb();
    }
    if (req.session && !req.session.save) {
      req.session.save = (cb: any) => cb();
    }
    next();
  });

  app.use(passport.initialize());
  app.use(passport.session());

  app.get("/api/health", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

  app.use("/api/auth", authRoutes);
  app.use("/api/emails", emailRoutes);

  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[unhandled error]", err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}