import { loadEnvFile } from "./load-env.mjs";

loadEnvFile();

if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is required. Configure .env.local locally or the Vercel environment variable before running this command."
  );
  process.exit(1);
}
