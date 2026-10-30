ALTER TABLE "payment_recoveries"
ADD COLUMN "claimToken" TEXT,
ADD COLUMN "claimExpiresAt" TIMESTAMP(3);
