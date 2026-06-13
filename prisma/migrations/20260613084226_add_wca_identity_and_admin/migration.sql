-- AlterTable
ALTER TABLE "users"
  ADD COLUMN "wca_user_id" INTEGER,
  ADD COLUMN "wca_id" TEXT,
  ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "users_wca_user_id_key" ON "users"("wca_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_wca_id_key" ON "users"("wca_id");
