-- CreateTable
CREATE TABLE "public"."tenant_billing" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "current_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "negative_limit" DOUBLE PRECISION NOT NULL DEFAULT -1000,
    "total_credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_debits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_transactions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance_before" DOUBLE PRECISION NOT NULL,
    "balance_after" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "payment_method" TEXT,
    "payment_status" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."bank_details" (
    "id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "iban" TEXT,
    "branch_code" TEXT,
    "branch_name" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."payment_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_method" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "gateway_ref" TEXT,
    "gateway_response" JSONB,
    "screenshot_url" TEXT,
    "screenshot_key" TEXT,
    "admin_notes" TEXT,
    "processed_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_billing_tenant_id_key" ON "public"."tenant_billing"("tenant_id");

-- CreateIndex
CREATE INDEX "billing_transactions_tenant_id_idx" ON "public"."billing_transactions"("tenant_id");

-- CreateIndex
CREATE INDEX "billing_transactions_type_idx" ON "public"."billing_transactions"("type");

-- CreateIndex
CREATE INDEX "billing_transactions_created_at_idx" ON "public"."billing_transactions"("created_at");

-- CreateIndex
CREATE INDEX "payment_requests_tenant_id_idx" ON "public"."payment_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "payment_requests_status_idx" ON "public"."payment_requests"("status");

-- AddForeignKey
ALTER TABLE "public"."tenant_billing" ADD CONSTRAINT "tenant_billing_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing_transactions" ADD CONSTRAINT "billing_transactions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant_billing"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
