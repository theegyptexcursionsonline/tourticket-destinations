export function revenueBookingCurrency(value: unknown, tenantCurrency = 'USD') {
  if (value === null || value === undefined || value === '') return tenantCurrency;
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) {
    throw new Error('Booking currency is outside the RevenuePilot read contract');
  }
  return value;
}

