-- CreateTable: org_domains
CREATE TABLE "org_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "ssl_status" TEXT NOT NULL DEFAULT 'pending',
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "org_domains_domain_key" ON "org_domains"("domain");

-- Migrate existing data from app_domains to org_domains
INSERT INTO "org_domains" ("id", "domain", "is_active", "ssl_status", "organization_id", "created_at")
SELECT
    ad."id",
    ad."domain",
    ad."is_active",
    ad."ssl_status",
    u."organization_id",
    ad."created_at"
FROM "app_domains" ad
JOIN "apps" a ON ad."app_id" = a."id"
JOIN "users" u ON a."user_id" = u."id";

-- DropTable
DROP TABLE "app_domains";

-- AddForeignKey
ALTER TABLE "org_domains" ADD CONSTRAINT "org_domains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
