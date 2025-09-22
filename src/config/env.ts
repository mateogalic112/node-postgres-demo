import { config } from "dotenv";
import { cleanEnv, port, str, url } from "envalid";

config({
  path: ".env.local"
});

export const env = cleanEnv(process.env, {
  POSTGRES_USER: str(),
  POSTGRES_PASSWORD: str(),
  POSTGRES_HOST: str(),
  POSTGRES_PORT: port({ default: 5432 }),
  POSTGRES_DB: str(),

  PORT: port({ default: 4000 }),

  JWT_SECRET: str(),
  FRONTEND_URL: url(),

  AWS_ACCESS_KEY_ID: str(),
  AWS_SECRET_ACCESS_KEY: str(),
  AWS_REGION: str(),
  AWS_S3_BUCKET: str(),

  ADMIN_EMAIL: str(),
  RESEND_API_KEY: str(),

  OPENAI_API_KEY: str(),

  STRIPE_SECRET_KEY: str()
});
