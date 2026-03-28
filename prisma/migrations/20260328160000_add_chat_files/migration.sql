-- CreateTable
CREATE TABLE "chat_files" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "extracted_text" TEXT,
    "summary" TEXT,
    "status" TEXT NOT NULL DEFAULT 'uploaded',
    "pipeline_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_files_user_id_idx" ON "chat_files"("user_id");

-- CreateIndex
CREATE INDEX "chat_files_organization_id_idx" ON "chat_files"("organization_id");

-- CreateIndex
CREATE INDEX "chat_files_pipeline_id_idx" ON "chat_files"("pipeline_id");

-- AddForeignKey
ALTER TABLE "chat_files" ADD CONSTRAINT "chat_files_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_files" ADD CONSTRAINT "chat_files_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
