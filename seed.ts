import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { DateTime } from "luxon";
const db = new PrismaClient();
function unseal(value: string, key: Buffer, aad: string) {
  const [, iv, tag, text] = value.split(".");
  const c = createDecipheriv("aes-256-gcm", key, Buffer.from(iv, "base64url"));
  c.setAAD(Buffer.from(aad));
  c.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([
    c.update(Buffer.from(text, "base64url")),
    c.final(),
  ]).toString();
}
function seal(value: string, key: Buffer, aad: string) {
  const iv = randomBytes(12),
    c = createCipheriv("aes-256-gcm", key, iv);
  c.setAAD(Buffer.from(aad));
  const b = Buffer.concat([c.update(value, "utf8"), c.final()]);
  return [
    "v1",
    iv.toString("base64url"),
    c.getAuthTag().toString("base64url"),
    b.toString("base64url"),
  ].join(".");
}

function tenantKey(id: string) {
  const key = Buffer.from(process.env.MASTER_ENCRYPTION_KEY ?? "", "base64");
  if (key.length !== 32) throw new Error("Ustaw MASTER_ENCRYPTION_KEY.");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(`tenant-key:${id}`));
  const value = Buffer.concat([
    cipher.update(randomBytes(32).toString("base64"), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    value.toString("base64url"),
  ].join(".");
}
async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_SEED !== "true"
  )
    throw new Error("Seed demonstracyjny jest zablokowany w produkcji.");
  const password = process.env.DEMO_PASSWORD;
  if (!password || password.length < 12)
    throw new Error("Ustaw DEMO_PASSWORD (co najmniej 12 znaków).");
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  for (const [id, name, slug] of [
    ["demo-spokoj", "Gabinet Spokój — DEMO", "demo-spokoj"],
    ["demo-rownowaga", "Pracownia Równowaga — DEMO", "demo-rownowaga"],
  ]) {
    await db.tenant.upsert({
      where: { id },
      update: {},
      create: {
        id,
        name,
        slug,
        status: "TRIAL",
        trialEndsAt: new Date(Date.now() + 30 * 86400000),
        encryptedDataKey: tenantKey(id),
      },
    });
  }
  for (const item of [
    {
      id: "demo-owner",
      tenantId: "demo-spokoj",
      email: "anna@webify.example",
      name: "Anna Kowalska",
      role: "OWNER" as const,
      tenantKind: "PRACTICE" as const,
    },
    {
      id: "demo-staff",
      tenantId: "demo-spokoj",
      email: "recepcja@webify.example",
      name: "Maria Nowak",
      role: "STAFF" as const,
      tenantKind: "PRACTICE" as const,
    },
    {
      id: "demo-owner-b",
      tenantId: "demo-rownowaga",
      email: "piotr@webify.example",
      name: "Piotr Zieliński",
      role: "OWNER" as const,
      tenantKind: "PRACTICE" as const,
    },
    {
      id: "demo-admin",
      tenantId: "webify-platform",
      email: "admin@webify.example",
      name: "Administrator Webify",
      role: "SUPER_ADMIN" as const,
      tenantKind: "PLATFORM" as const,
    },
  ])
    await db.user.upsert({
      where: { email: item.email },
      update: {},
      create: { ...item, passwordHash },
    });
  for (const item of [
    {
      id: "demo-patient-a",
      tenantId: "demo-spokoj",
      firstName: "Alicja",
      lastName: "Przykładowa",
    },
    {
      id: "demo-patient-b",
      tenantId: "demo-rownowaga",
      firstName: "Michał",
      lastName: "Przykładowy",
    },
  ])
    await db.patient.upsert({
      where: { id: item.id },
      update: {},
      create: item,
    });
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
  for (const [id, name, price, duration] of [
    ["demo-consult", "Konsultacja psychologiczna", 20000, 50],
    ["demo-therapy", "Terapia indywidualna", 22000, 50],
    ["demo-couple", "Konsultacja dla par", 30000, 80],
  ] as const)
    await db.service.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId: "demo-spokoj",
        name,
        priceGrosze: price,
        depositGrosze: 5000,
        durationMinutes: duration,
      },
    });
  for (const weekday of [1, 2, 3, 4, 5])
    await db.workingHour.upsert({
      where: {
        tenantId_providerId_weekday_startMinute: {
          tenantId: "demo-spokoj",
          providerId: "demo-owner",
          weekday,
          startMinute: 480,
        },
      },
      update: {},
      create: {
        tenantId: "demo-spokoj",
        providerId: "demo-owner",
        weekday,
        startMinute: 480,
        endMinute: 1200,
      },
    });
  for (const [id, firstName, lastName, status] of [
    ["demo-patient-c", "Tomasz", "Demonstracyjny", "ACTIVE"],
    ["demo-patient-d", "Joanna", "Testowa", "WAITLIST"],
    ["demo-patient-e", "Karolina", "Fikcyjna", "ACTIVE"],
  ] as const)
    await db.patient.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId: "demo-spokoj",
        firstName,
        lastName,
        status,
        consentData: true,
        consentContact: false,
        tags: ["Dane demo"],
        createdAt: new Date(Date.now() - 45 * 86400000),
      },
    });
  const day = DateTime.now().setZone("Europe/Warsaw").startOf("day");
  for (const [id, patientId, offset, hour, status] of [
    ["demo-visit-past", "demo-patient-a", -7, 10, "COMPLETED"],
    ["demo-visit-now", "demo-patient-a", 0, 14, "SCHEDULED"],
    ["demo-visit-next", "demo-patient-c", 0, 16, "SCHEDULED"],
    ["demo-visit-missed", "demo-patient-e", -3, 11, "NO_SHOW"],
  ] as const) {
    const start = day.plus({ days: offset, hours: hour });
    await db.appointment.upsert({
      where: { id },
      update: {},
      create: {
        id,
        tenantId: "demo-spokoj",
        patientId,
        providerId: "demo-owner",
        serviceId: "demo-consult",
        startsAt: start.toJSDate(),
        endsAt: start.plus({ minutes: 50 }).toJSDate(),
        status,
        priceGrosze: 20000,
      },
    });
  }
  const tenant = await db.tenant.findUniqueOrThrow({
    where: { id: "demo-spokoj" },
  });
  const key = Buffer.from(
    unseal(
      tenant.encryptedDataKey!,
      Buffer.from(process.env.MASTER_ENCRYPTION_KEY!, "base64"),
      "tenant-key:demo-spokoj",
    ),
    "base64",
  );
  const content = seal(
    "<h2>Notatka demonstracyjna</h2><p>Fikcyjny przykład układu SOAP. Nie zawiera rzeczywistych danych zdrowotnych.</p>",
    key,
    "demo-spokoj:note:demo-note:1",
  );
  await db.clinicalNote.upsert({
    where: { id: "demo-note" },
    update: {},
    create: {
      id: "demo-note",
      tenantId: "demo-spokoj",
      patientId: "demo-patient-a",
      appointmentId: "demo-visit-past",
      authorId: "demo-owner",
      contentEncrypted: content,
      versions: { create: { version: 1, contentEncrypted: content } },
    },
  });
  await db.therapyGoal.upsert({
    where: { id: "demo-goal" },
    update: {},
    create: {
      id: "demo-goal",
      tenantId: "demo-spokoj",
      patientId: "demo-patient-a",
      contentEncrypted: seal(
        "Przykładowy cel do omówienia podczas spotkania.",
        key,
        "demo-spokoj:goal:demo-goal",
      ),
    },
  });
  await db.treatmentPlan.upsert({
    where: {
      tenantId_patientId: {
        tenantId: "demo-spokoj",
        patientId: "demo-patient-a",
      },
    },
    update: {},
    create: {
      tenantId: "demo-spokoj",
      patientId: "demo-patient-a",
      contentEncrypted: seal(
        "Demonstracyjny plan: ustalenie celów i regularne podsumowanie współpracy.",
        key,
        "demo-spokoj:plan:demo-patient-a",
      ),
      summaryEncrypted: seal(
        "Dane fikcyjne, wyłącznie do prezentacji aplikacji.",
        key,
        "demo-spokoj:summary:demo-patient-a",
      ),
    },
  });
  if (!(await db.payment.findUnique({ where: { id: "demo-payment" } }))) {
    const paidAt = new Date(),
      receiptNumber = `${paidAt.getUTCFullYear()}/DEMO-001`;
    const snapshot = {
      clinic: tenant.name,
      address: "Przykładowa 1, Warszawa",
      nip: "",
      patient: "Alicja Przykładowa",
      service: "Konsultacja psychologiczna",
      amountGrosze: 20000,
      method: "TRANSFER",
      date: paidAt.toISOString(),
      receiptNumber,
    };
    await db.payment.create({
      data: {
        id: "demo-payment",
        tenantId: tenant.id,
        patientId: "demo-patient-a",
        appointmentId: "demo-visit-past",
        requestId: "demo-payment",
        amountGrosze: 20000,
        method: "TRANSFER",
        receiptNumber,
        paidAt,
        receiptSnapshotEncrypted: seal(
          JSON.stringify(snapshot),
          key,
          "demo-spokoj:receipt:demo-payment",
        ),
      },
    });
  }
  console.log(
    "Utworzono fikcyjne dane demo: dwa gabinety, cztery konta, pacjenci, wizyty, cennik, notatka, plan, cel i wpłata. Istniejące hasła nie zostały zmienione.",
  );
}
main()
  .catch(() => {
    console.error(
      "Seed nie powiódł się. Sprawdź konfigurację, migracje i wymagania README.",
    );
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
