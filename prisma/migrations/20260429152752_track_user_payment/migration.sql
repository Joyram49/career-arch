/*
  Warnings:

  - You are about to drop the column `metadata` on the `payments` table. All the data in the column will be lost.
  - Changed the type of `type` on the `payments` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('SUBSCRIPTION', 'REFUND', 'INCENTIVE', 'OTHER');

-- AlterTable
ALTER TABLE "payments" DROP COLUMN "metadata",
ADD COLUMN     "description" TEXT,
ADD COLUMN     "metaData" JSONB,
ADD COLUMN     "stripeChargeId" TEXT,
ADD COLUMN     "stripeRefundId" TEXT,
ADD COLUMN     "subscriptionId" TEXT,
DROP COLUMN "type",
ADD COLUMN     "type" "PaymentType" NOT NULL;

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_orgId_idx" ON "payments"("orgId");

-- CreateIndex
CREATE INDEX "payments_subscriptionId_idx" ON "payments"("subscriptionId");

-- CreateIndex
CREATE INDEX "payments_type_idx" ON "payments"("type");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
