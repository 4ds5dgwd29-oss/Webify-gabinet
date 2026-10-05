import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { z } from "zod";
const db = new PrismaClient();
export async function ensurePlans() {
  for (const [
    code,
    name,
    monthlyGrosze,
    yearlyGrosze,
    patientLimit,
    userLimit,
  ] of [
    ["START", "Start", 7900, 79000, 100, 1],
    ["PRO", "Pro", 14900, 149000, 500, 3],
    ["TEAM", "Zespół", 29900, 299000, 2000, 10],
  ] as const)
    await db.plan.upsert({
      where: { code },
      update: {},
      create: {
        tenantId: "webify-platform",
        code,
        name,
        monthlyGrosze,
        yearlyGrosze,
        patientLimit,
        userLimit,
        trialDays: 30,
      },
    });
}
async function main() {
  const d = z
    .object({
      ADMIN_EMAIL: z.string().email(),
      ADMIN_PASSWORD: z.string().min(16).max(128),
      ADMIN_NAME: z.string().min(2).default("Administrator Webify"),
    })
    .parse(process.env);
  await ensurePlans();
  if (
    await db.user.count({
      where: { tenantKind: "PLATFORM", role: "SUPER_ADMIN" },
    })
  )
    throw new Error(
      "Administrator już istnieje. Skrypt nie zmienia haseł ani uprawnień.",
    );
  const passwordHash = await argon2.hash(d.ADMIN_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  await db.user.create({
    data: {
      tenantId: "webify-platform",
      tenantKind: "PLATFORM",
      role: "SUPER_ADMIN",
      email: d.ADMIN_EMAIL.toLowerCase(),
      name: d.ADMIN_NAME,
      passwordHash,
    },
  });
  console.log(
    "Utworzono administratora i plany. Zaloguj się i włącz 2FA. Usuń ADMIN_PASSWORD z konfiguracji.",
  );
}
main()
  .catch(() => {
    console.error(
      "Bootstrap nie powiódł się. Sprawdź migracje, ADMIN_EMAIL/ADMIN_PASSWORD oraz istniejące konta administratora.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
