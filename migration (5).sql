-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountToken" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "targetTenantId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "percentOff" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Feedback_tenantId_createdAt_idx" ON "Feedback"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AccountToken_tokenHash_key" ON "AccountToken"("tokenHash");

-- CreateIndex
CREATE INDEX "AccountToken_tenantId_userId_idx" ON "AccountToken"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "SupportSession_tenantId_adminId_idx" ON "SupportSession"("tenantId", "adminId");

-- CreateIndex
CREATE UNIQUE INDEX "Coupon_code_key" ON "Coupon"("code");

-- AddForeignKey
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountToken" ADD CONSTRAINT "AccountToken_tenantId_userId_fkey" FOREIGN KEY ("tenantId", "userId") REFERENCES "User"("tenantId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Plan" ADD CONSTRAINT "Plan_platform_scope" CHECK ("tenantId" = 'webify-platform');
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_tenant_fk" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_platform_scope" CHECK ("tenantId" = 'webify-platform');
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_tenant_fk" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_platform_scope" CHECK ("tenantId" = 'webify-platform');
ALTER TABLE "WebhookEvent" ADD CONSTRAINT "WebhookEvent_tenant_fk" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id");
ALTER TABLE "SupportSession" ADD CONSTRAINT "SupportSession_platform_scope" CHECK ("tenantId" = 'webify-platform');
ALTER TABLE "SupportSession" ADD CONSTRAINT "SupportSession_admin_fk" FOREIGN KEY ("tenantId", "adminId") REFERENCES "User"("tenantId", "id");
ALTER TABLE "SupportSession" ADD CONSTRAINT "SupportSession_target_fk" FOREIGN KEY ("targetTenantId") REFERENCES "Tenant"("id");
