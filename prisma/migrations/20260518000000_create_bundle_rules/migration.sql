-- CreateTable
CREATE TABLE "BundleRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "triggerProductIdsJson" TEXT NOT NULL DEFAULT '[]',
    "triggerCollectionIdsJson" TEXT NOT NULL DEFAULT '[]',
    "groupsJson" TEXT NOT NULL,
    "discountType" TEXT NOT NULL,
    "discountValue" REAL NOT NULL,
    "discountAppliesTo" TEXT NOT NULL DEFAULT 'bundle_items',
    "startsAt" DATETIME,
    "endsAt" DATETIME,
    "allowMultipleApplications" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "excludedProductIdsJson" TEXT NOT NULL DEFAULT '[]',
    "excludedCollectionIdsJson" TEXT NOT NULL DEFAULT '[]',
    "widgetViews" INTEGER NOT NULL DEFAULT 0,
    "addToCartClicks" INTEGER NOT NULL DEFAULT 0,
    "successfulAddsToCart" INTEGER NOT NULL DEFAULT 0,
    "discountApplications" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "BundleRule_shop_status_idx" ON "BundleRule"("shop", "status");

-- CreateIndex
CREATE INDEX "BundleRule_shop_priority_idx" ON "BundleRule"("shop", "priority");
