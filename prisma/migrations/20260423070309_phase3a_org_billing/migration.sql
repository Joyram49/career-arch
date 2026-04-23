-- AlterEnum
ALTER TYPE "IncentiveStatus" ADD VALUE 'OVERDUE';

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "hasUnpaidIncentives" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isPaymentMethodOnFile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripeDefaultPaymentMethodId" TEXT;
