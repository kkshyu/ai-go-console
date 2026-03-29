-- AlterEnum
ALTER TYPE "AppStatus" ADD VALUE 'importing';

-- CreateTable
CREATE TABLE "import_sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "import_session_id" TEXT NOT NULL,
    "app_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploading',
    "file_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "progress_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "import_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "import_sessions_import_session_id_key" ON "import_sessions"("import_session_id");

-- CreateIndex
CREATE INDEX "import_sessions_app_id_idx" ON "import_sessions"("app_id");

-- CreateIndex
CREATE INDEX "import_sessions_user_id_idx" ON "import_sessions"("user_id");
