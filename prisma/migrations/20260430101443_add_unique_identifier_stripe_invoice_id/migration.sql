/*
  Warnings:

  - A unique constraint covering the columns `[stripePaymentIntentId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeInvoiceId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[stripeRefundId]` on the table `payments` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "payments_stripePaymentIntentId_key" ON "payments"("stripePaymentIntentId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeInvoiceId_key" ON "payments"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_stripeRefundId_key" ON "payments"("stripeRefundId");
