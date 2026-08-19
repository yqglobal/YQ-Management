import { Injectable } from '@nestjs/common';
import { PaymentProviderName } from '@prisma/client';

export interface CreateCheckoutInput {
  tenantId: string;
  subscriptionId: string;
  planId: string;
  amount: number;
  currency: string;
  billingInterval: string;
  returnUrl: string;
  cancelUrl: string;
  notifyUrl: string;
  metadata?: Record<string, unknown>;
}

export interface CheckoutResult {
  checkoutUrl: string;
  paymentReference: string;
  expiresAt: Date;
  providerTransactionId: string;
  hash?: string;
}

export interface VerifyWebhookInput {
  payload: Record<string, unknown>;
  headers: Record<string, unknown>;
  signature: string;
}

export interface VerifyWebhookResult {
  valid: boolean;
  eventId?: string;
  eventType?: string;
  tenantId?: string;
  subscriptionId?: string;
  transactionId?: string;
  amount?: number;
  currency?: string;
}

export interface RefundInput {
  transactionId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  status: string;
}

export interface GetTransactionInput {
  transactionId: string;
}

export interface GetTransactionResult {
  id: string;
  status: string;
  amount: number;
  currency: string;
  providerTransactionId: string;
  rawResponse: Record<string, unknown> | null;
}

export interface CancelSubscriptionInput {
  subscriptionId: string;
  immediate?: boolean;
}

export interface CancelSubscriptionResult {
  success: boolean;
  cancelledAt?: Date;
  effectiveDate?: Date;
}

export interface VerifyPaymentInput {
  paymentReference: string;
  workspaceId: string;
}

export interface VerifyPaymentResult {
  verified: boolean;
  status: string;
  amount: number;
  currency: string;
  paidAt?: Date;
}

export interface PaymentProvider {
  readonly providerName: PaymentProviderName;
  createCheckout(input: CreateCheckoutInput): Promise<CheckoutResult>;
  verifyWebhook(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;
  validateSignature(
    payload: object,
    signature: string,
    secret: string,
  ): Promise<boolean>;
  refund(input: RefundInput): Promise<RefundResult>;
  cancelSubscription(
    input: CancelSubscriptionInput,
  ): Promise<CancelSubscriptionResult>;
  getTransaction(input: GetTransactionInput): Promise<GetTransactionResult>;
  verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult>;
}
