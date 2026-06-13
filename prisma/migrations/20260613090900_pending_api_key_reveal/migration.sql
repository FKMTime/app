-- AlterTable
ALTER TABLE "competitions" ADD COLUMN     "pending_api_key_enc" TEXT,
ADD COLUMN     "pending_api_key_expires_at" TIMESTAMP(3);

