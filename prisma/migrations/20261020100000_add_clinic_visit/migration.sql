-- CreateEnum
CREATE TYPE "ClinicVisitStatus" AS ENUM ('REGISTERED', 'CHECKED_IN', 'SAMPLE_COLLECTED', 'SAMPLE_SENT_TO_LAB', 'LAB_REPORT_RECEIVED', 'AI_REPORT_READY', 'CONSULTATION_COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "clinic_visits" (
    "id" TEXT NOT NULL,
    "visitNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "ClinicVisitStatus" NOT NULL DEFAULT 'REGISTERED',
    "checkedInAt" TIMESTAMP(3),
    "sampleCollectedAt" TIMESTAMP(3),
    "sampleSentToLabAt" TIMESTAMP(3),
    "labReportReceivedAt" TIMESTAMP(3),
    "aiReportReadyAt" TIMESTAMP(3),
    "consultationCompletedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_visits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clinic_visits_visitNumber_key" ON "clinic_visits"("visitNumber");

-- CreateIndex
CREATE UNIQUE INDEX "clinic_visits_orderId_key" ON "clinic_visits"("orderId");

-- AddForeignKey
ALTER TABLE "clinic_visits" ADD CONSTRAINT "clinic_visits_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

