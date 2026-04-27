-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "applyCountResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "applyCountThisMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "savedJobCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "plan_catalogue" (
    "id" TEXT NOT NULL,
    "key" "SubscriptionPlan" NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "monthlyPriceCents" INTEGER NOT NULL DEFAULT 0,
    "stripeProductId" TEXT,
    "stripePriceId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_catalogue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plan_catalogue_key_key" ON "plan_catalogue"("key");
