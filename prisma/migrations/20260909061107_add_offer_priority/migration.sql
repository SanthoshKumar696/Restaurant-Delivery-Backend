-- AlterEnum
ALTER TYPE "discount_type" ADD VALUE 'BUY_ONE_GET_ONE';

-- AlterTable
ALTER TABLE "offers" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 1;
