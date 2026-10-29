-- Add BOOKING to PaymentTiming enum
ALTER TYPE "PaymentTiming" ADD VALUE IF NOT EXISTS 'BOOKING';
