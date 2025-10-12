-- AlterTable
ALTER TABLE "public"."orders" ADD COLUMN "shipping_charges" DOUBLE PRECISION DEFAULT 0,
ALTER COLUMN "total_amount" SET DEFAULT 0,
ALTER COLUMN "total_tax" SET DEFAULT 0,
ALTER COLUMN "total_discounts" SET DEFAULT 0;
