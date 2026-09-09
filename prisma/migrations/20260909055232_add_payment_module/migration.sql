-- CreateEnum
CREATE TYPE "payment_method" AS ENUM ('CASH_ON_DELIVERY', 'ONLINE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "payment_status" ADD VALUE 'SUCCESS';
ALTER TYPE "payment_status" ADD VALUE 'CANCELLED';

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(20) NOT NULL,
    "branch_id" VARCHAR(20) NOT NULL,
    "order_id" INTEGER NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "payment_status" "payment_status" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'INR',
    "reference_id" VARCHAR(100),
    "gateway_name" VARCHAR(50),
    "gateway_payment_id" VARCHAR(150),
    "gateway_order_id" VARCHAR(150),
    "paid_at" TIMESTAMPTZ(6),
    "failure_reason" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE INDEX "idx_payments_tenant_status" ON "payments"("tenant_id", "payment_status");

-- CreateIndex
CREATE INDEX "idx_payments_customer" ON "payments"("tenant_id", "customer_id");

-- CreateIndex
CREATE INDEX "idx_payments_branch" ON "payments"("tenant_id", "branch_id");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
