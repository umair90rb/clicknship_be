/*
  Warnings:

  - Added the required column `courier` to the `courier_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dispatch_address` to the `courier_services` table without a default value. This is not possible if the table is not empty.
  - Added the required column `return_address` to the `courier_services` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."courier_services" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "courier" TEXT NOT NULL,
ADD COLUMN     "dispatch_address" TEXT NOT NULL,
ADD COLUMN     "return_address" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."courier_service_fields" (
    "id" SERIAL NOT NULL,
    "field" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "courierServiceId" INTEGER NOT NULL,

    CONSTRAINT "courier_service_fields_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."courier_service_fields" ADD CONSTRAINT "courier_service_fields_courierServiceId_fkey" FOREIGN KEY ("courierServiceId") REFERENCES "public"."courier_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
