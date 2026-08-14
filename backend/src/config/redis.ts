import IORedis from "ioredis";
import { env } from "./env";

export const redisConnection = env.REDIS_URL
  ? new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })
  : new IORedis({
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD,
      maxRetriesPerRequest: null,
      tls: env.NODE_ENV === "production" && env.REDIS_PASSWORD ? {} : undefined,
    });

redisConnection.on("error", (err) => {
  console.error("[redis] connection error:", err.message);
});