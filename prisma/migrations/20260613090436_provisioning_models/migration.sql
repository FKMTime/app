-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('REQUESTED', 'REJECTED', 'APPROVED', 'LIVE', 'FINISHED');

-- CreateEnum
CREATE TYPE "CompetitionRoleKind" AS ENUM ('ORGANIZER', 'DELEGATE');

-- CreateEnum
CREATE TYPE "CompetitionRoleSource" AS ENUM ('WCA', 'MANUAL');

-- CreateTable
CREATE TABLE "competitions" (
    "id" TEXT NOT NULL,
    "wca_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "short_name" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "status" "CompetitionStatus" NOT NULL DEFAULT 'REQUESTED',
    "request_notes" TEXT,
    "rejection_reason" TEXT,
    "proxy_tunnel_url" TEXT,
    "proxy_secret_enc" TEXT,
    "requested_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),

    CONSTRAINT "competitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "last_four" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "last_used_at" TIMESTAMP(3),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competition_roles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "role" "CompetitionRoleKind" NOT NULL,
    "source" "CompetitionRoleSource" NOT NULL DEFAULT 'WCA',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "competition_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "competitions_wca_id_key" ON "competitions"("wca_id");

-- CreateIndex
CREATE INDEX "competitions_status_idx" ON "competitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "api_keys"("key_hash");

-- CreateIndex
CREATE INDEX "api_keys_competition_id_idx" ON "api_keys"("competition_id");

-- CreateIndex
CREATE INDEX "competition_roles_competition_id_idx" ON "competition_roles"("competition_id");

-- CreateIndex
CREATE UNIQUE INDEX "competition_roles_user_id_competition_id_role_key" ON "competition_roles"("user_id", "competition_id", "role");

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_roles" ADD CONSTRAINT "competition_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competition_roles" ADD CONSTRAINT "competition_roles_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

