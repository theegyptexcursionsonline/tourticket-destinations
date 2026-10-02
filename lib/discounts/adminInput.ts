import { NextResponse } from 'next/server';

export class DiscountInputError extends Error {}
type DiscountFields = {
  code?: string;
  discountType?: 'percentage' | 'fixed';
  value?: number;
  isActive?: boolean;
  expiresAt?: Date | null;
  usageLimit?: number | null;
};

export function parseDiscountInput(input: unknown, partial = false): DiscountFields {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new DiscountInputError('Enter valid discount details.');
  const body = input as Record<string, unknown>;
  const fields = new Set(['code', 'discountType', 'value', 'isActive', 'expiresAt', 'usageLimit', 'tenantId']);
  if (Object.keys(body).some(key => !fields.has(key))) throw new DiscountInputError('Unsupported discount field.');
  const result: DiscountFields = {};
  if (!partial || 'code' in body) {
    if (typeof body.code !== 'string') throw new DiscountInputError('Enter a valid discount code.');
    const code = body.code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{1,64}$/.test(code)) throw new DiscountInputError('Use letters, numbers, hyphens or underscores for the discount code.');
    result.code = code;
  }
  if (!partial || 'discountType' in body) {
    if (body.discountType !== 'percentage' && body.discountType !== 'fixed') throw new DiscountInputError('Choose a valid discount type.');
    result.discountType = body.discountType;
  }
  if (!partial || 'value' in body) {
    if (typeof body.value !== 'number' || !Number.isFinite(body.value) || body.value <= 0) throw new DiscountInputError('Enter a discount value greater than zero.');
    result.value = body.value;
  }
  if (result.discountType === 'percentage' && result.value !== undefined && result.value > 100) throw new DiscountInputError('A percentage discount cannot exceed 100%.');
  if ('isActive' in body) {
    if (typeof body.isActive !== 'boolean') throw new DiscountInputError('Choose a valid discount status.');
    result.isActive = body.isActive;
  }
  if ('expiresAt' in body) {
    if (body.expiresAt === null) result.expiresAt = null;
    else {
      if (typeof body.expiresAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(body.expiresAt)) throw new DiscountInputError('Enter a valid expiry date.');
      const date = new Date(body.expiresAt);
      if (!Number.isFinite(date.getTime())) throw new DiscountInputError('Enter a valid expiry date.');
      result.expiresAt = date;
    }
  }
  if ('usageLimit' in body) {
    if (body.usageLimit === null) result.usageLimit = null;
    else if (typeof body.usageLimit !== 'number' || !Number.isSafeInteger(body.usageLimit) || body.usageLimit < 0) throw new DiscountInputError('Enter a valid usage limit.');
    else result.usageLimit = body.usageLimit;
  }
  if (partial && Object.keys(result).length === 0) throw new DiscountInputError('Choose a discount field to update.');
  return result;
}

export function discountMutationError(error: unknown) {
  if (error instanceof DiscountInputError || error instanceof SyntaxError) {
    return NextResponse.json({ success: false, error: error instanceof SyntaxError ? 'Enter valid discount details.' : error.message }, { status: 400 });
  }
  if (error && typeof error === 'object' && 'code' in error && error.code === 11000) {
    return NextResponse.json({ success: false, error: 'This discount code already exists. Choose a different code.' }, { status: 409 });
  }
  return NextResponse.json({ success: false, error: 'Discounts are temporarily unavailable. Please try again.' }, { status: 503 });
}
