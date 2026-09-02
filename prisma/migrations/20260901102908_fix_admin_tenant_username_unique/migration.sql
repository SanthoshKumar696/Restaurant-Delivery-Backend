/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,username]` on the table `admins` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "admins_username_key";

-- CreateIndex
CREATE UNIQUE INDEX "admins_tenant_id_username_key" ON "admins"("tenant_id", "username");
