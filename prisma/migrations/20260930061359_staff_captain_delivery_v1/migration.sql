-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "delivery_status" ADD VALUE 'PENDING';
ALTER TYPE "delivery_status" ADD VALUE 'ACCEPTED';
ALTER TYPE "delivery_status" ADD VALUE 'OUT_FOR_DELIVERY';
ALTER TYPE "delivery_status" ADD VALUE 'ARRIVED';

-- AlterEnum
ALTER TYPE "staff_role" ADD VALUE 'MANAGER';

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "accepted_at" TIMESTAMPTZ(6),
ADD COLUMN     "arrived_at" TIMESTAMPTZ(6),
ADD COLUMN     "out_for_delivery_at" TIMESTAMPTZ(6),
ALTER COLUMN "assigned_at" DROP NOT NULL,
ALTER COLUMN "assigned_at" DROP DEFAULT;
