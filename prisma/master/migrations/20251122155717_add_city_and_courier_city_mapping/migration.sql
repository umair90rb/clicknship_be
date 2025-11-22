-- CreateTable
CREATE TABLE "public"."cities" (
    "id" SERIAL NOT NULL,
    "city" TEXT NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."courier_mapped_cities" (
    "id" SERIAL NOT NULL,
    "courier" TEXT NOT NULL,
    "mapped" TEXT NOT NULL,
    "courier_city_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "city_id" INTEGER NOT NULL,

    CONSTRAINT "courier_mapped_cities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."courier_mapped_cities" ADD CONSTRAINT "courier_mapped_cities_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "public"."cities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
