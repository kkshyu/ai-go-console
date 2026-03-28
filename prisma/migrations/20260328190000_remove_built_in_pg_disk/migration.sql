-- Remove built_in_pg and built_in_disk service types

-- 0. Deduplicate services (remove duplicates keeping the newest)
DELETE FROM "app_services" WHERE "service_id" IN (
  SELECT id FROM "services" s1 WHERE EXISTS (
    SELECT 1 FROM "services" s2 WHERE s1.id = s2.id AND s1.ctid <> s2.ctid
  )
);
DELETE FROM "user_allowed_service_instances" WHERE "service_id" IN (
  SELECT id FROM "services" s1 WHERE EXISTS (
    SELECT 1 FROM "services" s2 WHERE s1.id = s2.id AND s1.ctid <> s2.ctid
  )
);
DELETE FROM "services" a USING "services" b
  WHERE a.ctid < b.ctid AND a.id = b.id;

-- 1. Delete referencing data for built_in_pg and built_in_disk
DELETE FROM "app_services" WHERE "service_id" IN (
  SELECT id FROM "services" WHERE type IN ('built_in_pg', 'built_in_disk')
);
DELETE FROM "user_allowed_service_instances" WHERE "service_id" IN (
  SELECT id FROM "services" WHERE type IN ('built_in_pg', 'built_in_disk')
);
DELETE FROM "services" WHERE type IN ('built_in_pg', 'built_in_disk');
DELETE FROM "org_allowed_services" WHERE "service_type" IN ('built_in_pg', 'built_in_disk');

-- 2. Recreate enum without built_in_pg and built_in_disk
CREATE TYPE "ServiceType_new" AS ENUM (
  'postgresql', 'mysql', 'mongodb',
  's3', 'gcs', 'azure_blob', 'google_drive',
  'stripe', 'paypal', 'ecpay',
  'sendgrid', 'ses', 'mailgun',
  'twilio', 'vonage', 'aws_sns',
  'auth0', 'firebase_auth', 'line_login',
  'supabase', 'hasura',
  'line_bot', 'whatsapp', 'discord', 'telegram',
  'built_in_real_estate', 'built_in_supabase',
  'built_in_accounting', 'built_in_auto_repair',
  'built_in_beauty', 'built_in_cleaning',
  'built_in_education', 'built_in_fitness',
  'built_in_hospitality', 'built_in_legal',
  'built_in_logistics', 'built_in_medical',
  'built_in_pet_care', 'built_in_photography',
  'built_in_realestate', 'built_in_restaurant',
  'built_in_retail',
  'openai', 'gemini', 'claude', 'openrouter'
);

-- 3. Alter columns to use new enum
ALTER TABLE "services" ALTER COLUMN "type" TYPE "ServiceType_new" USING ("type"::text::"ServiceType_new");
ALTER TABLE "org_allowed_services" ALTER COLUMN "service_type" TYPE "ServiceType_new" USING ("service_type"::text::"ServiceType_new");

-- 4. Drop old enum and rename new
DROP TYPE "ServiceType";
ALTER TYPE "ServiceType_new" RENAME TO "ServiceType";
