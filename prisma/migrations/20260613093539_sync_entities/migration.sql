-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('UPCOMING', 'ONGOING', 'FINISHED');

-- CreateEnum
CREATE TYPE "AssignmentRole" AS ENUM ('COMPETITOR', 'JUDGE', 'RUNNER', 'SCRAMBLER');

-- CreateEnum
CREATE TYPE "AttemptType" AS ENUM ('STANDARD', 'EXTRA');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('STANDARD', 'EXTRA', 'DNF', 'DNS');

-- CreateEnum
CREATE TYPE "IncidentKind" AS ENUM ('NOTEWORTHY', 'MANUAL', 'WARNING');

-- CreateTable
CREATE TABLE "persons" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "registrant_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "wca_user_id" INTEGER,
    "wca_id" TEXT,
    "country_iso2" TEXT,
    "gender" TEXT,
    "source_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "activity_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "room_name" TEXT,
    "room_color" TEXT,
    "status" "GroupStatus" NOT NULL DEFAULT 'UPCOMING',
    "start_time" TIMESTAMP(3),
    "end_time" TIMESTAMP(3),
    "source_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "group_id" TEXT NOT NULL,
    "role" "AssignmentRole" NOT NULL,
    "source_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "results" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "person_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "round_id" TEXT NOT NULL,
    "source_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "result_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "penalty" INTEGER NOT NULL DEFAULT 0,
    "type" "AttemptType" NOT NULL DEFAULT 'STANDARD',
    "replaced_by" INTEGER,
    "status" "AttemptStatus" NOT NULL DEFAULT 'STANDARD',
    "description" TEXT,
    "edited_by_id" TEXT,
    "edited_at" TIMESTAMP(3),
    "source_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "incidents" (
    "id" TEXT NOT NULL,
    "competition_id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "kind" "IncidentKind" NOT NULL,
    "description" TEXT NOT NULL,
    "person_id" TEXT,
    "attempt_id" TEXT,
    "source_updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "incidents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_status" (
    "competition_id" TEXT NOT NULL,
    "last_heartbeat_at" TIMESTAMP(3),
    "last_delta_at" TIMESTAMP(3),
    "instance_version" TEXT,
    "last_client_sent_at" TIMESTAMP(3),

    CONSTRAINT "sync_status_pkey" PRIMARY KEY ("competition_id")
);

-- CreateIndex
CREATE INDEX "persons_competition_id_wca_user_id_idx" ON "persons"("competition_id", "wca_user_id");

-- CreateIndex
CREATE UNIQUE INDEX "persons_competition_id_instance_id_key" ON "persons"("competition_id", "instance_id");

-- CreateIndex
CREATE INDEX "groups_competition_id_activity_code_idx" ON "groups"("competition_id", "activity_code");

-- CreateIndex
CREATE UNIQUE INDEX "groups_competition_id_instance_id_key" ON "groups"("competition_id", "instance_id");

-- CreateIndex
CREATE INDEX "assignments_competition_id_person_id_idx" ON "assignments"("competition_id", "person_id");

-- CreateIndex
CREATE INDEX "assignments_competition_id_group_id_idx" ON "assignments"("competition_id", "group_id");

-- CreateIndex
CREATE UNIQUE INDEX "assignments_competition_id_instance_id_key" ON "assignments"("competition_id", "instance_id");

-- CreateIndex
CREATE INDEX "results_competition_id_round_id_idx" ON "results"("competition_id", "round_id");

-- CreateIndex
CREATE UNIQUE INDEX "results_competition_id_instance_id_key" ON "results"("competition_id", "instance_id");

-- CreateIndex
CREATE INDEX "attempts_result_id_idx" ON "attempts"("result_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_competition_id_instance_id_key" ON "attempts"("competition_id", "instance_id");

-- CreateIndex
CREATE INDEX "incidents_competition_id_idx" ON "incidents"("competition_id");

-- CreateIndex
CREATE UNIQUE INDEX "incidents_competition_id_instance_id_key" ON "incidents"("competition_id", "instance_id");

-- AddForeignKey
ALTER TABLE "persons" ADD CONSTRAINT "persons_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "results" ADD CONSTRAINT "results_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_edited_by_id_fkey" FOREIGN KEY ("edited_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_person_id_fkey" FOREIGN KEY ("person_id") REFERENCES "persons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "incidents" ADD CONSTRAINT "incidents_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_status" ADD CONSTRAINT "sync_status_competition_id_fkey" FOREIGN KEY ("competition_id") REFERENCES "competitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

