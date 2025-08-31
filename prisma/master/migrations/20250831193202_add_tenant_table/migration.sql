-- CreateTable
CREATE TABLE "tenants" (
    "tenant_id" TEXT NOT NULL,
    "db_name" TEXT,
    "company_name" TEXT,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_tenant_id_key" ON "tenants"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_db_name_key" ON "tenants"("db_name");
