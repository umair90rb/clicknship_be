-- CreateTable
CREATE TABLE "public"."feedback" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_phone" TEXT,
    "stars" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."support_cases" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_phone" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "admin_notes" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."feature_requests" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" INTEGER NOT NULL,
    "user_email" TEXT NOT NULL,
    "user_phone" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "admin_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."attachments" (
    "id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "s3_key" TEXT NOT NULL,
    "s3_bucket" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "support_case_id" TEXT,
    "feature_request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "feedback_tenant_id_idx" ON "public"."feedback"("tenant_id");

-- CreateIndex
CREATE INDEX "feedback_category_idx" ON "public"."feedback"("category");

-- CreateIndex
CREATE INDEX "feedback_stars_idx" ON "public"."feedback"("stars");

-- CreateIndex
CREATE INDEX "support_cases_tenant_id_idx" ON "public"."support_cases"("tenant_id");

-- CreateIndex
CREATE INDEX "support_cases_status_idx" ON "public"."support_cases"("status");

-- CreateIndex
CREATE INDEX "support_cases_priority_idx" ON "public"."support_cases"("priority");

-- CreateIndex
CREATE INDEX "feature_requests_tenant_id_idx" ON "public"."feature_requests"("tenant_id");

-- CreateIndex
CREATE INDEX "feature_requests_status_idx" ON "public"."feature_requests"("status");

-- CreateIndex
CREATE INDEX "attachments_support_case_id_idx" ON "public"."attachments"("support_case_id");

-- CreateIndex
CREATE INDEX "attachments_feature_request_id_idx" ON "public"."attachments"("feature_request_id");

-- AddForeignKey
ALTER TABLE "public"."feedback" ADD CONSTRAINT "feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."support_cases" ADD CONSTRAINT "support_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."feature_requests" ADD CONSTRAINT "feature_requests_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_support_case_id_fkey" FOREIGN KEY ("support_case_id") REFERENCES "public"."support_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."attachments" ADD CONSTRAINT "attachments_feature_request_id_fkey" FOREIGN KEY ("feature_request_id") REFERENCES "public"."feature_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
