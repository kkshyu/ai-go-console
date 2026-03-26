-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "agent_role" TEXT,
ADD COLUMN     "pipeline_id" TEXT,
ADD COLUMN     "stage" TEXT;

-- CreateTable
CREATE TABLE "agent_pipelines" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'idle',
    "current_stage" TEXT NOT NULL DEFAULT 'requirements',
    "completed_stages" TEXT[],
    "stage_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "app_id" TEXT,

    CONSTRAINT "agent_pipelines_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "agent_pipelines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_pipelines" ADD CONSTRAINT "agent_pipelines_app_id_fkey" FOREIGN KEY ("app_id") REFERENCES "apps"("id") ON DELETE CASCADE ON UPDATE CASCADE;
