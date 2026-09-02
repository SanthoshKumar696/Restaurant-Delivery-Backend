/*
  Warnings:

  - The primary key for the `audit_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `audit_logs` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `captain_locations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `captain_locations` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - The primary key for the `notification_logs` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `notification_logs` table. The data in that column could be lost. The data in that column will be cast from `BigInt` to `Integer`.
  - You are about to alter the column `idempotency_key` on the `orders` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `VarChar(36)`.

*/
-- AlterTable
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE INTEGER,
ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "captain_locations" DROP CONSTRAINT "captain_locations_pkey",
ALTER COLUMN "id" SET DATA TYPE INTEGER,
ADD CONSTRAINT "captain_locations_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "notification_logs" DROP CONSTRAINT "notification_logs_pkey",
ALTER COLUMN "id" SET DATA TYPE INTEGER,
ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id");

-- AlterTable
ALTER TABLE "orders" ALTER COLUMN "idempotency_key" SET DATA TYPE VARCHAR(36);
