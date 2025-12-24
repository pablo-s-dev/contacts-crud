import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.url(),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  FRONTEND_URL: z.url(),
  REDIS_URL: z.string().url().optional(),
});

const _env = envSchema.safeParse(process.env);

import { fromZodError } from "zod-validation-error";

if (!_env.success) {
  console.error(
    "❌ Invalid environment variables",
    fromZodError(_env.error).toString(),
  );
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
