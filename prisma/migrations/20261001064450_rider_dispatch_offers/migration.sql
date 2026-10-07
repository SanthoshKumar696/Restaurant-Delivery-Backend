-- CreateEnum
CREATE TYPE "delivery_offer_status" AS ENUM ('OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "delivery_status" ADD VALUE 'OFFERED';

-- CreateTable
CREATE TABLE "delivery_offers" (
    "id" SERIAL NOT NULL,
    "delivery_id" INTEGER NOT NULL,
    "captain_id" INTEGER NOT NULL,
    "tenant_id" VARCHAR(20) NOT NULL,
    "status" "delivery_offer_status" NOT NULL DEFAULT 'OFFERED',
    "offered_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded_at" TIMESTAMPTZ(6),

    CONSTRAINT "delivery_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_delivery_offers_captain_status" ON "delivery_offers"("tenant_id", "captain_id", "status");

-- CreateIndex
CREATE INDEX "idx_delivery_offers_delivery_status" ON "delivery_offers"("delivery_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_offers_delivery_id_captain_id_key" ON "delivery_offers"("delivery_id", "captain_id");

-- AddForeignKey
ALTER TABLE "delivery_offers" ADD CONSTRAINT "delivery_offers_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "deliveries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_offers" ADD CONSTRAINT "delivery_offers_captain_id_fkey" FOREIGN KEY ("captain_id") REFERENCES "captains"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_offers" ADD CONSTRAINT "delivery_offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
