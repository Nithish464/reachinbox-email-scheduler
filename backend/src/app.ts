import express from "express";
import cors from "cors";
import cookieSession from "cookie-session";
import passport from "./config/passport";
import { env } from "./config/env";
import authRoutes from "./routes/authRoutes";
import emailRoutes from "./routes/emailRoutes";

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "2mb" }));
  app.use(
    cors({
      origin: env.FRONTEND_URL,
      credentials: true,
    })
  );

  app.use(
    cookieSession({
      name: "reachinbox.sid",
      keys: [env.SESSION_SECRET],
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
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
