-- CreateTable: Product Attributes
CREATE TABLE "public"."product_attributes" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Product Attribute Values
CREATE TABLE "public"."product_attribute_values" (
    "id" SERIAL NOT NULL,
    "value" TEXT NOT NULL,
    "attribute_id" INTEGER NOT NULL,

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Product Variants
CREATE TABLE "public"."product_variants" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "unit_price" INTEGER,
    "cost_price" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "product_id" INTEGER NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Product Variant Attributes (junction)
CREATE TABLE "public"."product_variant_attributes" (
    "id" SERIAL NOT NULL,
    "variant_id" INTEGER NOT NULL,
    "attribute_value_id" INTEGER NOT NULL,

    CONSTRAINT "product_variant_attributes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Product Attributes
CREATE UNIQUE INDEX "product_attributes_name_key" ON "public"."product_attributes"("name");

-- CreateIndex: Product Attribute Values
CREATE UNIQUE INDEX "product_attribute_values_attribute_id_value_key" ON "public"."product_attribute_values"("attribute_id", "value");

-- CreateIndex: Product Variants
CREATE UNIQUE INDEX "product_variants_sku_key" ON "public"."product_variants"("sku");

-- CreateIndex: Product Variant Attributes
CREATE UNIQUE INDEX "product_variant_attributes_variant_id_attribute_value_id_key" ON "public"."product_variant_attributes"("variant_id", "attribute_value_id");

-- AddForeignKey: Product Attribute Values -> Product Attributes
ALTER TABLE "public"."product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "public"."product_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Product Variants -> Products
ALTER TABLE "public"."product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Product Variant Attributes -> Product Variants
ALTER TABLE "public"."product_variant_attributes" ADD CONSTRAINT "product_variant_attributes_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: Product Variant Attributes -> Product Attribute Values
ALTER TABLE "public"."product_variant_attributes" ADD CONSTRAINT "product_variant_attributes_attribute_value_id_fkey" FOREIGN KEY ("attribute_value_id") REFERENCES "public"."product_attribute_values"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate inventory tables from product_id to variant_id

-- DropForeignKey: Inventory Items
ALTER TABLE "public"."inventory_items" DROP CONSTRAINT "inventory_items_product_id_fkey";

-- DropForeignKey: Purchase Order Items
ALTER TABLE "public"."purchase_order_items" DROP CONSTRAINT "purchase_order_items_product_id_fkey";

-- DropForeignKey: Stock Transfer Items
ALTER TABLE "public"."stock_transfer_items" DROP CONSTRAINT "stock_transfer_items_product_id_fkey";

-- DropIndex: Inventory Items
DROP INDEX "public"."inventory_items_product_id_idx";
DROP INDEX "public"."inventory_items_product_id_location_id_key";

-- AlterTable: Inventory Items - Replace product_id with variant_id
ALTER TABLE "public"."inventory_items" DROP COLUMN "product_id",
ADD COLUMN     "variant_id" INTEGER NOT NULL;

-- AlterTable: Purchase Order Items - Replace product_id with variant_id
ALTER TABLE "public"."purchase_order_items" DROP COLUMN "product_id",
ADD COLUMN     "variant_id" INTEGER NOT NULL;

-- AlterTable: Stock Transfer Items - Replace product_id with variant_id
ALTER TABLE "public"."stock_transfer_items" DROP COLUMN "product_id",
ADD COLUMN     "variant_id" INTEGER NOT NULL;

-- CreateIndex: Inventory Items with variant_id
CREATE INDEX "inventory_items_variant_id_idx" ON "public"."inventory_items"("variant_id");
CREATE UNIQUE INDEX "inventory_items_variant_id_location_id_key" ON "public"."inventory_items"("variant_id", "location_id");

-- AddForeignKey: Inventory Items -> Product Variants
ALTER TABLE "public"."inventory_items" ADD CONSTRAINT "inventory_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Purchase Order Items -> Product Variants
ALTER TABLE "public"."purchase_order_items" ADD CONSTRAINT "purchase_order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: Stock Transfer Items -> Product Variants
ALTER TABLE "public"."stock_transfer_items" ADD CONSTRAINT "stock_transfer_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
