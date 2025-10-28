/*
  Warnings:

  - You are about to drop the column `price` on the `products` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[customer_id]` on the table `order_addresses` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `customer_id` to the `order_addresses` table without a default value. This is not possible if the table is not empty.
  - Added the required column `barcode` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sku` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `unit_price` to the `products` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."order_addresses" ADD COLUMN     "customer_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "public"."products" DROP COLUMN "price",
ADD COLUMN     "barcode" TEXT NOT NULL,
ADD COLUMN     "brand_id" INTEGER,
ADD COLUMN     "category_id" INTEGER,
ADD COLUMN     "cost_price" INTEGER,
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "sku" TEXT NOT NULL,
ADD COLUMN     "unit_id" INTEGER,
ADD COLUMN     "unit_price" INTEGER NOT NULL,
ADD COLUMN     "weight" INTEGER;

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "brand_id" INTEGER,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."unit_of_measures" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "unit_of_measures_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "order_addresses_customer_id_key" ON "public"."order_addresses"("customer_id");

-- AddForeignKey
ALTER TABLE "public"."order_addresses" ADD CONSTRAINT "order_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "public"."unit_of_measures"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."products" ADD CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE SET NULL ON UPDATE CASCADE;
