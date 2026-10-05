-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "legalHold" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "retentionUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ObjectDeletion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ObjectDeletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ObjectDeletion_objectKey_key" ON "ObjectDeletion"("objectKey");

-- CreateIndex
CREATE INDEX "ObjectDeletion_tenantId_completedAt_idx" ON "ObjectDeletion"("tenantId", "completedAt");

-- AddForeignKey
ALTER TABLE "ObjectDeletion" ADD CONSTRAINT "ObjectDeletion_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

