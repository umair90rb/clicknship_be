/*
  Warnings:

  - The primary key for the `order_tracking_metadata` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The required column `id` was added to the `order_tracking_metadata` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.

*/
-- DropIndex
DROP INDEX "public"."order_tracking_metadata_tenant_id_key";

-- AlterTable
ALTER TABLE "public"."order_tracking_metadata" DROP CONSTRAINT "order_tracking_metadata_pkey",
ADD COLUMN     "id" TEXT NOT NULL,
ADD CONSTRAINT "order_tracking_metadata_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE INDEX "order_tracking_metadata_tenant_id_tracking_started_at_idx" ON "public"."order_tracking_metadata"("tenant_id", "tracking_started_at");
