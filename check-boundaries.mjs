import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
let failures = 0;
function walk(dir) {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) {
      walk(path);
      continue;
    }
    if (!/\.tsx?$/.test(path)) continue;
    const content = readFileSync(path, "utf8");
    const allowed =
      /^src\/server\/(auth|dal)\//.test(path) || path === "src/server/db.ts";
    // Importy Prisma typu są dozwolone; klient i SQL wyłącznie w serwerowej warstwie danych.
    if (
      !allowed &&
      (/import(?!\s+type)[^;]*["'](?:@\/server\/db|[^"']*\/db|@prisma\/client)["']/.test(
        content,
      ) ||
        /new PrismaClient|\$queryRaw|\$executeRaw/.test(content))
    ) {
      console.error(`Niedozwolony dostęp do bazy: ${path}`);
      failures++;
    }
  }
}
walk("src");
if (failures) process.exit(1);
console.log("Granice dostępu do bazy: OK");
