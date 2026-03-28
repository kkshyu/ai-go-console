-- Add import session support to chat_files
ALTER TABLE "chat_files" ADD COLUMN "import_session_id" TEXT;
ALTER TABLE "chat_files" ADD COLUMN "relative_path" TEXT;
CREATE INDEX "chat_files_import_session_id_idx" ON "chat_files"("import_session_id");
