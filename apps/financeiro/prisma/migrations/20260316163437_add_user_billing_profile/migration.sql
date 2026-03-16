-- CreateTable
CREATE TABLE "UserBillingProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserBillingProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserBillingProfile_userId_key" ON "UserBillingProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserBillingProfile_stripeCustomerId_key" ON "UserBillingProfile"("stripeCustomerId");

-- AddForeignKey
ALTER TABLE "UserBillingProfile" ADD CONSTRAINT "UserBillingProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
