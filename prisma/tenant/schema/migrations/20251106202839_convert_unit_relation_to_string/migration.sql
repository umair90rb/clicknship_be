/*
  Warnings:

  - You are about to drop the column `unit_id` on the `products` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."products" DROP CONSTRAINT "products_unit_id_fkey";

-- AlterTable
ALTER TABLE "public"."products" DROP COLUMN "unit_id",
ADD COLUMN     "unit" TEXT;
