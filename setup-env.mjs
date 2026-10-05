import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
if (existsSync(".env")) {
  console.error("Plik .env już istnieje. Nie nadpisano sekretów.");
  process.exit(1);
}
const databasePassword=randomBytes(24).toString("hex");
const template = readFileSync(".env.example", "utf8")
  .replaceAll("webify_local",databasePassword)
  .replace('CRON_SECRET=""',`CRON_SECRET="${randomBytes(32).toString("base64url")}"`)
  .replace('BACKUP_ENCRYPTION_KEY=""',`BACKUP_ENCRYPTION_KEY="${randomBytes(32).toString("base64")}"`)
  .replace(
    'NEXTAUTH_SECRET=""',
    `NEXTAUTH_SECRET="${randomBytes(48).toString("base64url")}"`,
  )
  .replace(
    'MASTER_ENCRYPTION_KEY=""',
    `MASTER_ENCRYPTION_KEY="${randomBytes(32).toString("base64")}"`,
  )
  .replace(
    'DEMO_PASSWORD=""',
    `DEMO_PASSWORD="${randomBytes(18).toString("base64url")}"`,
  );
writeFileSync(".env", template, { mode: 0o600 });
console.log(
  "Utworzono .env z losowymi sekretami. Hasło kont demo znajduje się w DEMO_PASSWORD.",
);
