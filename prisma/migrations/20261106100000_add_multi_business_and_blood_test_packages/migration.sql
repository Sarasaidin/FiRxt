
BEGIN;

-- ============================================================
-- 1. New enums
-- ============================================================

CREATE TYPE "LocationSource" AS ENUM (
    'GEOCODED',
    'MANUAL_PIN',
    'NOT_SET'
);

CREATE TYPE "BloodTestPackageApprovalStatus" AS ENUM (
    'PENDING',
    'APPROVED',
    'REJECTED',
    'SUSPENDED'
);

CREATE TYPE "BloodTestPackageVisibility" AS ENUM (
    'PRIVATE',
    'SHARED'
);

-- ============================================================
-- 2. Business types
-- ============================================================

CREATE TABLE "business_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_types_code_key"
    ON "business_types"("code");

-- Stable IDs allow existing partners to be mapped consistently.
INSERT INTO "business_types" (
    "id", "code", "name", "description", "isActive",
    "createdAt", "updatedAt"
)
VALUES
    (
        'bt_pharmacy', 'PHARMACY', 'Pharmacy', NULL, true,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    ),
    (
        'bt_clinic', 'CLINIC', 'Clinic', NULL, true,
        CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
    );

-- ============================================================
-- 3. Partner changes
-- ============================================================

ALTER TABLE "partners"
    ADD COLUMN "businessTypeId" TEXT,
    ADD COLUMN "businessRegistrationNumber" TEXT,
    ADD COLUMN "locationSource" "LocationSource"
        NOT NULL DEFAULT 'NOT_SET';

ALTER TABLE "partners"
    ALTER COLUMN "latitude" DROP NOT NULL,
    ALTER COLUMN "longitude" DROP NOT NULL;

-- Map existing partners using their existing PartnerType.
UPDATE "partners"
SET "businessTypeId" = CASE
    WHEN "type" = 'PHARMACY'::"PartnerType" THEN 'bt_pharmacy'
    WHEN "type" = 'CLINIC'::"PartnerType" THEN 'bt_clinic'
    ELSE NULL
END;

-- A user may own multiple businesses.
DROP INDEX "partners_userId_key";

CREATE INDEX "partners_userId_idx"
    ON "partners"("userId");

CREATE INDEX "partners_businessTypeId_idx"
    ON "partners"("businessTypeId");

CREATE UNIQUE INDEX "partners_businessRegistrationNumber_key"
    ON "partners"("businessRegistrationNumber");

ALTER TABLE "partners"
    ADD CONSTRAINT "partners_businessTypeId_fkey"
    FOREIGN KEY ("businessTypeId")
    REFERENCES "business_types"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- ============================================================
-- 4. Lab tests
-- ============================================================

CREATE TABLE "lab_tests" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_tests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "lab_tests_code_key"
    ON "lab_tests"("code");

-- ============================================================
-- 5. Blood test packages
-- ============================================================

CREATE TABLE "blood_test_packages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "price" INTEGER NOT NULL,
    "originalPrice" INTEGER,
    "preparationInstructions" TEXT,
    "sampleType" TEXT,
    "turnaroundDays" INTEGER,
    "ownerPartnerId" TEXT,
    "approvalStatus" "BloodTestPackageApprovalStatus"
        NOT NULL DEFAULT 'PENDING',
    "visibility" "BloodTestPackageVisibility"
        NOT NULL DEFAULT 'PRIVATE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blood_test_packages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "blood_test_packages_ownerPartnerId_idx"
    ON "blood_test_packages"("ownerPartnerId");

CREATE INDEX "blood_test_packages_approvalStatus_visibility_isActive_idx"
    ON "blood_test_packages"("approvalStatus", "visibility", "isActive");

ALTER TABLE "blood_test_packages"
    ADD CONSTRAINT "blood_test_packages_ownerPartnerId_fkey"
    FOREIGN KEY ("ownerPartnerId")
    REFERENCES "partners"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ============================================================
-- 6. Blood test package composition
-- ============================================================

CREATE TABLE "blood_test_package_tests" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "labTestId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "blood_test_package_tests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blood_test_package_tests_packageId_labTestId_key"
    ON "blood_test_package_tests"("packageId", "labTestId");

CREATE INDEX "blood_test_package_tests_labTestId_idx"
    ON "blood_test_package_tests"("labTestId");

ALTER TABLE "blood_test_package_tests"
    ADD CONSTRAINT "blood_test_package_tests_packageId_fkey"
    FOREIGN KEY ("packageId")
    REFERENCES "blood_test_packages"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "blood_test_package_tests"
    ADD CONSTRAINT "blood_test_package_tests_labTestId_fkey"
    FOREIGN KEY ("labTestId")
    REFERENCES "lab_tests"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ============================================================
-- 7. Clinic-specific package offers
-- ============================================================

CREATE TABLE "clinic_packages" (
    "id" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "priceOverride" INTEGER,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clinic_packages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "clinic_packages_clinicId_packageId_key"
    ON "clinic_packages"("clinicId", "packageId");

CREATE INDEX "clinic_packages_packageId_idx"
    ON "clinic_packages"("packageId");

ALTER TABLE "clinic_packages"
    ADD CONSTRAINT "clinic_packages_clinicId_fkey"
    FOREIGN KEY ("clinicId")
    REFERENCES "partners"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "clinic_packages"
    ADD CONSTRAINT "clinic_packages_packageId_fkey"
    FOREIGN KEY ("packageId")
    REFERENCES "blood_test_packages"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

-- ============================================================
-- 8. OrderItem package references and snapshots
-- ============================================================

ALTER TABLE "order_items"
    ADD COLUMN "bloodTestPackageId" TEXT,
    ADD COLUMN "packageNameSnapshot" TEXT,
    ADD COLUMN "includedTestsSnapshot" JSONB,
    ADD COLUMN "preparationInstructionsSnapshot" TEXT;

-- Preserve historical order items by preventing referenced
-- catalogue records from being physically deleted.
ALTER TABLE "order_items"
    DROP CONSTRAINT "order_items_productId_fkey";

ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_productId_fkey"
    FOREIGN KEY ("productId")
    REFERENCES "products"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "order_items"
    DROP CONSTRAINT "order_items_serviceId_fkey";

ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_serviceId_fkey"
    FOREIGN KEY ("serviceId")
    REFERENCES "services"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_bloodTestPackageId_fkey"
    FOREIGN KEY ("bloodTestPackageId")
    REFERENCES "blood_test_packages"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE;

CREATE INDEX "order_items_bloodTestPackageId_idx"
    ON "order_items"("bloodTestPackageId");

-- Exactly one reference must exist and match itemType.
ALTER TABLE "order_items"
    ADD CONSTRAINT "order_items_exactly_one_item_reference_check"
    CHECK (
        (
            "itemType" = 'PHYSICAL'::"ProductType"
            AND "productId" IS NOT NULL
            AND "serviceId" IS NULL
            AND "bloodTestPackageId" IS NULL
        )
        OR
        (
            "itemType" = 'SERVICE'::"ProductType"
            AND "productId" IS NULL
            AND "serviceId" IS NOT NULL
            AND "bloodTestPackageId" IS NULL
        )
        OR
        (
            "itemType" = 'BLOOD_TEST_PACKAGE'::"ProductType"
            AND "productId" IS NULL
            AND "serviceId" IS NULL
            AND "bloodTestPackageId" IS NOT NULL
        )
    );

COMMIT;
