-- AlterTable
ALTER TABLE "apps" ADD COLUMN     "auto_scale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "cpu_limit_millis" INTEGER,
ADD COLUMN     "max_replicas" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "memory_limit_mb" INTEGER;

-- DropTable
DROP TABLE IF EXISTS "content_chunks";
