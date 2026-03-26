-- Rename 'disk' to 's3' in ServiceType enum
ALTER TYPE "ServiceType" RENAME VALUE 'disk' TO 's3';

-- Update existing org_allowed_services records
-- (handled automatically by the enum rename above)

-- Update existing services records
-- (handled automatically by the enum rename above)
