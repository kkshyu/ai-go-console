-- RenameEnum
ALTER TYPE "DataSourceType" RENAME TO "CredentialType";

-- RenameTable
ALTER TABLE "data_sources" RENAME TO "credentials";

-- RenameTable
ALTER TABLE "app_data_sources" RENAME TO "app_credentials";

-- RenameColumn
ALTER TABLE "app_credentials" RENAME COLUMN "data_source_id" TO "credential_id";

-- RenameConstraint
ALTER TABLE "credentials" RENAME CONSTRAINT "data_sources_pkey" TO "credentials_pkey";

-- RenameConstraint
ALTER TABLE "app_credentials" RENAME CONSTRAINT "app_data_sources_pkey" TO "app_credentials_pkey";

-- RenameConstraint
ALTER TABLE "app_credentials" RENAME CONSTRAINT "app_data_sources_app_id_fkey" TO "app_credentials_app_id_fkey";

-- RenameConstraint
ALTER TABLE "app_credentials" RENAME CONSTRAINT "app_data_sources_data_source_id_fkey" TO "app_credentials_credential_id_fkey";
