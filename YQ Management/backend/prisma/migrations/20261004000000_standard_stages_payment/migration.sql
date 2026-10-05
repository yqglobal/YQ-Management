-- Standard stages (CHECK_IN / CHECK_OUT bookends) + payment timing/method tracking. Additive only.
ALTER TYPE "StepType" ADD VALUE IF NOT EXISTS 'CHECK_IN';
ALTER TYPE "StepType" ADD VALUE IF NOT EXISTS 'CHECK_OUT';

CREATE TYPE "PaymentTiming" AS ENUM ('CHECKIN', 'CHECKOUT', 'NONE');
CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE_ONLINE', 'STRIPE_QR', 'STRIPE_LINK', 'CASH', 'CARD_TERMINAL', 'EFT', 'OTHER');
CREATE TYPE "PaymentSource" AS ENUM ('CHECKIN', 'CHECKOUT');

ALTER TABLE "ServiceFlow"
  ADD COLUMN "paymentTiming" "PaymentTiming" NOT NULL DEFAULT 'CHECKIN',
  ADD COLUMN "checkinPayMode" TEXT NOT NULL DEFAULT 'ONLINE_OR_COUNTER',
  ADD COLUMN "autoSendInvoice" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowUnpaidCheckout" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "FlowStepTemplate"
  ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "category" TEXT,
  ADD COLUMN "customerView" JSONB;

ALTER TABLE "BookingPayment"
  ADD COLUMN "method" "PaymentMethod",
  ADD COLUMN "source" "PaymentSource",
  ADD COLUMN "recordedByStaffId" TEXT,
  ADD COLUMN "proofUrl" TEXT;

ALTER TABLE "Visit"
  ADD COLUMN "lineItems" JSONB,
  ADD COLUMN "balanceDue" DOUBLE PRECISION;
