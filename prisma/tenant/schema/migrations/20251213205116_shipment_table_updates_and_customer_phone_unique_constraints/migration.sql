/*
  Warnings:

  - You are about to drop the `order_deliveries` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[phone]` on the table `customers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."order_deliveries" DROP CONSTRAINT "order_deliveries_order_id_fkey";

-- DropTable
DROP TABLE "public"."order_deliveries";

-- CreateTable
CREATE TABLE "public"."order_shipments" (
    "id" SERIAL NOT NULL,
    "cn" TEXT,
    "status" TEXT,
    "last_tracked_at" TIMESTAMP(3),
    "tracking_json" JSONB,
    "order_id" INTEGER NOT NULL,
    "courier_service_id" INTEGER NOT NULL,

    CONSTRAINT "order_shipments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_shipments_order_id_key" ON "public"."order_shipments"("order_id");

-- CreateIndex
CREATE INDEX "order_shipments_cn_idx" ON "public"."order_shipments"("cn");

-- CreateIndex
CREATE INDEX "order_shipments_order_id_idx" ON "public"."order_shipments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_key" ON "public"."customers"("phone");

-- AddForeignKey
ALTER TABLE "public"."order_shipments" ADD CONSTRAINT "order_shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
