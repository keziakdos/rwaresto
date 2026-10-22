-- AlterTable
ALTER TABLE "Order" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE INDEX "Order_clientId_status_idx" ON "Order"("clientId", "status");
