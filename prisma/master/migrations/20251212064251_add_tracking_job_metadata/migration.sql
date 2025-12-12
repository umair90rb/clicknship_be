-- CreateTable
CREATE TABLE "public"."order_tracking_metadata" (
    "tracking_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tracking_ended_at" TIMESTAMP(3),
    "no_of_jobs" INTEGER NOT NULL,
    "no_of_orders" INTEGER NOT NULL,
    "tenant_id" TEXT NOT NULL,

    CONSTRAINT "order_tracking_metadata_pkey" PRIMARY KEY ("tenant_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_tracking_metadata_tenant_id_key" ON "public"."order_tracking_metadata"("tenant_id");

-- AddForeignKey
ALTER TABLE "public"."order_tracking_metadata" ADD CONSTRAINT "order_tracking_metadata_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("tenant_id") ON DELETE RESTRICT ON UPDATE CASCADE;
