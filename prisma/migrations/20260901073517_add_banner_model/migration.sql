-- CreateTable
CREATE TABLE "banners" (
    "id" SERIAL NOT NULL,
    "tenant_id" VARCHAR(20) NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "image_url" TEXT,
    "offer_text" VARCHAR(255),
    "coupon_code" VARCHAR(50),
    "start_date" TIMESTAMPTZ(6),
    "end_date" TIMESTAMPTZ(6),
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_banners_tenant" ON "banners"("tenant_id");

-- CreateIndex
CREATE INDEX "idx_banners_active" ON "banners"("is_active");

-- AddForeignKey
ALTER TABLE "banners" ADD CONSTRAINT "banners_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
