-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'user');

-- CreateEnum
CREATE TYPE "AppStatus" AS ENUM ('developing', 'stopped', 'building', 'running', 'error');

-- CreateEnum
CREATE TYPE "DataSourceType" AS ENUM ('postgres', 'supabase', 'mysql', 'redis');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'user',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apps" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "template" TEXT NOT NULL,
    "status" "AppStatus" NOT NULL DEFAULT 'developing',
    "port" INTEGER,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,

    CONSTRAINT "apps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "ssl_status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "app_id" TEXT NOT NULL,

    CONSTRAINT "app_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_sources" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DataSourceType" NOT NULL,
    "credentials_encrypted" TEXT NOT NULL,
    "iv" TEXT NOT NULL,
    "auth_tag" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "data_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_data_sources" (
    "app_id" TEXT NOT NULL,
    "data_source_id" TEXT NOT NULL,
    "env_var_prefix" TEXT NOT NULL DEFAULT 'DB',

    CONSTRAINT "app_data_sources_pkey" PRIMARY KEY ("app_id","data_source_id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "app_id" TEXT,
    "user_id" TEXT,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "apps_slug_key" ON "apps"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "app_domains_domain_key" ON "app_domains"("domain");

-- AddForeignKey
ALTER TABLE "apps" ADD CONSTRAINT "apps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_domains" ADD CONSTRAINT "app_domains_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_data_sources" ADD CONSTRAINT "app_data_sources_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_data_sources" ADD CONSTRAINT "app_data_sources_data_source_id_fkey" FOREIGN KEY ("data_source_id") REFERENCES "data_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
