import "dotenv/config";
import { z } from "zod";

/**
 * Single source of truth for all environment variables.
 * Zod validates them at startup — fail fast if anything is missing.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  API_PORT: z.coerce.number().default(4000),
  FRONTEND_URL: z.string().url().default("http://localhost:3000"),

  // Postgres
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_HOST: z.string().default("localhost"),
  REDIS_PORT: z.coerce.number().default(6379),

  // Google OAuth (optional in dev — pass real creds for actual OAuth flow)
  GOOGLE_CLIENT_ID: z.string().default("placeholder"),
  GOOGLE_CLIENT_SECRET: z.string().default("placeholder"),
  GOOGLE_CALLBACK_URL: z
    .string()
    .url()
    .default("http://localhost:4000/auth/google/callback"),

  // JWT
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRY: z.string().default("7d"),

  // Ethereal SMTP
  SMTP_HOST: z.string().default("smtp.ethereal.email"),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().default(""),
  SMTP_PASS: z.string().default(""),

  // Rate limits
  MAX_EMAILS_PER_HOUR: z.coerce.number().positive().default(50),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("❌ Invalid environment variables:");
    console.error(parsed.error.flatten().fieldErrors);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
