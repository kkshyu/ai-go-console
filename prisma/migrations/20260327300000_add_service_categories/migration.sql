-- Add new service types to the ServiceType enum
-- database
ALTER TYPE "ServiceType" ADD VALUE 'mysql';
ALTER TYPE "ServiceType" ADD VALUE 'mongodb';
-- storage
ALTER TYPE "ServiceType" ADD VALUE 'gcs';
ALTER TYPE "ServiceType" ADD VALUE 'azure_blob';
-- payment
ALTER TYPE "ServiceType" ADD VALUE 'paypal';
ALTER TYPE "ServiceType" ADD VALUE 'ecpay';
-- email
ALTER TYPE "ServiceType" ADD VALUE 'sendgrid';
ALTER TYPE "ServiceType" ADD VALUE 'ses';
ALTER TYPE "ServiceType" ADD VALUE 'mailgun';
-- sms
ALTER TYPE "ServiceType" ADD VALUE 'twilio';
ALTER TYPE "ServiceType" ADD VALUE 'vonage';
ALTER TYPE "ServiceType" ADD VALUE 'aws_sns';
-- auth
ALTER TYPE "ServiceType" ADD VALUE 'auth0';
ALTER TYPE "ServiceType" ADD VALUE 'firebase_auth';
ALTER TYPE "ServiceType" ADD VALUE 'line_login';

-- Backfill: add new service types as allowed for all existing organizations
INSERT INTO org_allowed_services (id, organization_id, service_type, enabled)
SELECT gen_random_uuid(), o.id, t.type::"ServiceType", true
FROM organizations o
CROSS JOIN (VALUES
  ('mysql'), ('mongodb'),
  ('gcs'), ('azure_blob'),
  ('paypal'), ('ecpay'),
  ('sendgrid'), ('ses'), ('mailgun'),
  ('twilio'), ('vonage'), ('aws_sns'),
  ('auth0'), ('firebase_auth'), ('line_login')
) AS t(type)
WHERE NOT EXISTS (
  SELECT 1 FROM org_allowed_services oas
  WHERE oas.organization_id = o.id AND oas.service_type = t.type::"ServiceType"
);
