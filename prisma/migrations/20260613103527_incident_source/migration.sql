-- CreateEnum
CREATE TYPE "IncidentSource" AS ENUM ('SYNC', 'MANUAL');

-- AlterTable
ALTER TABLE "incidents" ADD COLUMN     "created_by_id" TEXT,
ADD COLUMN     "source" "IncidentSource" NOT NULL DEFAULT 'SYNC';

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

