-- AlterTable
ALTER TABLE "public"."order_items" ALTER COLUMN "product_id" SET DATA TYPE TEXT,
ALTER COLUMN "variant_id" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "public"."order_logs" ALTER COLUMN "user_id" DROP NOT NULL;
