-- Migrate existing built_in_real_estate services to built_in_realestate
UPDATE "Service" SET "type" = 'built_in_realestate' WHERE "type" = 'built_in_real_estate';
UPDATE "OrgAllowedService" SET "serviceType" = 'built_in_realestate' WHERE "serviceType" = 'built_in_real_estate';

-- Remove built_in_real_estate from ServiceType enum
-- PostgreSQL requires creating a new enum without the value and swapping
ALTER TYPE "ServiceType" RENAME TO "ServiceType_old";

CREATE TYPE "ServiceType" AS ENUM (
  'postgresql', 'mysql', 'mongodb',
  's3', 'gcs', 'azure_blob', 'google_drive',
  'stripe', 'paypal', 'ecpay',
  'sendgrid', 'ses', 'mailgun',
  'twilio', 'vonage', 'aws_sns',
  'auth0', 'firebase_auth', 'line_login',
  'supabase', 'hasura',
  'line_bot', 'whatsapp', 'discord', 'telegram',
  'built_in_supabase',
  'built_in_keycloak', 'built_in_minio', 'built_in_n8n',
  'built_in_qdrant', 'built_in_meilisearch', 'built_in_posthog', 'built_in_metabase',
  'built_in_accounting', 'built_in_auto_repair', 'built_in_beauty',
  'built_in_cleaning', 'built_in_education', 'built_in_fitness',
  'built_in_hospitality', 'built_in_legal', 'built_in_logistics',
  'built_in_medical', 'built_in_pet_care', 'built_in_photography',
  'built_in_realestate', 'built_in_restaurant', 'built_in_retail',
  'openai', 'gemini', 'claude', 'openrouter'
);

ALTER TABLE "Service" ALTER COLUMN "type" TYPE "ServiceType" USING ("type"::text::"ServiceType");
ALTER TABLE "OrgAllowedService" ALTER COLUMN "serviceType" TYPE "ServiceType" USING ("serviceType"::text::"ServiceType");

DROP TYPE "ServiceType_old";
