-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "date_of_birth" DATE;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;
