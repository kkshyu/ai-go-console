-- CreateEnum: ServiceType
CREATE TYPE "ServiceType" AS ENUM ('disk', 'postgresql', 'supabase', 'stripe', 'hasura');

-- CreateTable: organizations
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- Seed a default organization for existing data
INSERT INTO "organizations" ("id", "name", "slug", "created_at", "updated_at")
VALUES ('default-org', 'Default Organization', 'default-org', NOW(), NOW());

-- Add organization_id to users (nullable first for migration)
ALTER TABLE "users" ADD COLUMN "organization_id" TEXT;
UPDATE "users" SET "organization_id" = 'default-org';
ALTER TABLE "users" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename credentials table to services
ALTER TABLE "credentials" RENAME TO "services";

-- Rename credentials_encrypted to config_encrypted
ALTER TABLE "services" RENAME COLUMN "credentials_encrypted" TO "config_encrypted";

-- Add organization_id and endpoint_url to services
ALTER TABLE "services" ADD COLUMN "organization_id" TEXT;
ALTER TABLE "services" ADD COLUMN "endpoint_url" TEXT;
UPDATE "services" SET "organization_id" = 'default-org';
ALTER TABLE "services" ALTER COLUMN "organization_id" SET NOT NULL;
ALTER TABLE "services" ADD CONSTRAINT "services_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rename app_credentials table to app_services
ALTER TABLE "app_credentials" RENAME TO "app_services";

-- Rename credential_id to service_id in app_services
ALTER TABLE "app_services" RENAME COLUMN "credential_id" TO "service_id";

-- Update foreign key constraints on app_services
ALTER TABLE "app_services" DROP CONSTRAINT IF EXISTS "app_credentials_credential_id_fkey";
ALTER TABLE "app_services" DROP CONSTRAINT IF EXISTS "app_credentials_app_id_fkey";
ALTER TABLE "app_services" DROP CONSTRAINT IF EXISTS "app_credentials_pkey";
ALTER TABLE "app_services" ADD CONSTRAINT "app_services_pkey" PRIMARY KEY ("app_id", "service_id");
ALTER TABLE "app_services" ADD CONSTRAINT "app_services_app_id_fkey"
    FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "app_services" ADD CONSTRAINT "app_services_service_id_fkey"
    FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate CredentialType enum values to ServiceType
-- First, alter the type column to text temporarily
ALTER TABLE "services" ALTER COLUMN "type" TYPE TEXT;

-- Map old values to new
UPDATE "services" SET "type" = 'postgresql' WHERE "type" = 'postgres';
-- mysql and redis rows get mapped to closest match or deleted
DELETE FROM "services" WHERE "type" IN ('mysql', 'redis');

-- Cast to new enum
ALTER TABLE "services" ALTER COLUMN "type" TYPE "ServiceType" USING "type"::"ServiceType";

-- Drop old enum
DROP TYPE "CredentialType";

-- CreateTable: org_allowed_services
CREATE TABLE "org_allowed_services" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "service_type" "ServiceType" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "org_allowed_services_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "org_allowed_services_organization_id_service_type_key"
    ON "org_allowed_services"("organization_id", "service_type");
ALTER TABLE "org_allowed_services" ADD CONSTRAINT "org_allowed_services_organization_id_fkey"
    FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed default allowed services for the default org
INSERT INTO "org_allowed_services" ("id", "organization_id", "service_type", "enabled") VALUES
    ('oas-disk', 'default-org', 'disk', true),
    ('oas-postgresql', 'default-org', 'postgresql', true),
    ('oas-supabase', 'default-org', 'supabase', true),
    ('oas-stripe', 'default-org', 'stripe', true),
    ('oas-hasura', 'default-org', 'hasura', true);
