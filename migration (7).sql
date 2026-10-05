-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SystemLog_tenantId_createdAt_idx" ON "SystemLog"("tenantId", "createdAt");

ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_platform_scope" CHECK ("tenantId" = 'webify-platform');
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_tenant_fk" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
