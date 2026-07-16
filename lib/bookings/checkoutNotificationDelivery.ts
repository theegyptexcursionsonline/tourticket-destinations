export type CheckoutNotificationChannel = 'customer' | 'operator';

export interface CheckoutNotificationOutcome {
  customer: 'sent' | 'failed';
  operator: 'sent' | 'failed';
}

interface CheckoutNotificationDeliveryInput {
  sendCustomer: () => Promise<void>;
  sendOperator: () => Promise<void>;
  onFailure: (channel: CheckoutNotificationChannel, error: unknown) => Promise<void>;
}

/** Deliver customer and operator notifications as independent outcomes. */
export async function deliverCheckoutNotifications({
  sendCustomer,
  sendOperator,
  onFailure,
}: CheckoutNotificationDeliveryInput): Promise<CheckoutNotificationOutcome> {
  let customer: CheckoutNotificationOutcome['customer'] = 'failed';
  let operator: CheckoutNotificationOutcome['operator'] = 'failed';

  try {
    await sendCustomer();
    customer = 'sent';
  } catch (error) {
    await onFailure('customer', error);
  }

  try {
    await sendOperator();
    operator = 'sent';
  } catch (error) {
    await onFailure('operator', error);
  }

  return { customer, operator };
}
