-- CreateTable
CREATE TABLE "agent_model_configs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "agent_role" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_model_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_model_configs_organization_id_agent_role_key" ON "agent_model_configs"("organization_id", "agent_role");

-- AddForeignKey
ALTER TABLE "agent_model_configs" ADD CONSTRAINT "agent_model_configs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
