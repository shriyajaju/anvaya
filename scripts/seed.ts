import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const seedPath = join(dirname(fileURLToPath(import.meta.url)), "../supabase/seed.sql");
const sql = postgres(databaseUrl, { prepare: false, max: 1 });

await sql.unsafe(readFileSync(seedPath, "utf8"));
await sql.end();
console.log("Seed applied.");
