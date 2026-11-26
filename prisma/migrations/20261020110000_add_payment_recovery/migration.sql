-- CreateEnum
CREATE TYPE "PaymentRecoveryStatus" AS ENUM ('PENDING', 'REFUNDING', 'REFUNDED', 'MANUAL_REVIEW');

-- CreateTable
CREATE TABLE "payment_recoveries" (
    "id" TEXT NOT NULL,
    "stripeSessionId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "stripeRefundId" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'myr',
    "reason" TEXT NOT NULL,
    "status" "PaymentRecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_recoveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "payment_recoveries_stripeSessionId_key" ON "payment_recoveries"("stripeSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_recoveries_stripeRefundId_key" ON "payment_recoveries"("stripeRefundId");
