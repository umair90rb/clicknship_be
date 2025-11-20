/*
  Warnings:

  - You are about to drop the column `courierServiceId` on the `courier_service_fields` table. All the data in the column will be lost.
  - Added the required column `courier_service_id` to the `courier_service_fields` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."courier_service_fields" DROP CONSTRAINT "courier_service_fields_courierServiceId_fkey";

-- AlterTable
ALTER TABLE "public"."courier_service_fields" DROP COLUMN "courierServiceId",
ADD COLUMN     "courier_service_id" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."courier_service_fields" ADD CONSTRAINT "courier_service_fields_courier_service_id_fkey" FOREIGN KEY ("courier_service_id") REFERENCES "public"."courier_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
