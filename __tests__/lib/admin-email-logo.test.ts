/** @jest-environment node */

const mockSendEmail = jest.fn();

jest.mock('@/lib/mailgun', () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import { EmailService } from '@/lib/email/emailService';
import { resolveTenantEmailWebsite } from '@/lib/email/tenantWebsite';

describe('admin booking email tenant logo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.ADMIN_NOTIFICATION_EMAIL = 'notifications@example.com';
    mockSendEmail.mockResolvedValue(undefined);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    jest.restoreAllMocks();
  });

  it('renders a relative logo on the tenant domain, never the shared checkout domain', async () => {
    await EmailService.sendAdminBookingAlert({
      customerName: 'QA Guest',
      customerEmail: 'qa@example.com',
      tourTitle: 'El Gouna Lagoon Kayak Tour',
      bookingId: 'ELGO-QA-001',
      bookingDate: 'Sunday, September 20, 2026',
      bookingTime: '10:00',
      totalPrice: '$54.00',
      paymentMethod: 'card',
      tenantBranding: {
        tenantId: 'el-gouna',
        companyName: 'El Gouna Excursions',
        logo: '/tenants/el-gouna/logo.png',
        primaryColor: '#35CBFE',
        secondaryColor: '#2284A5',
        accentColor: '#7CDDFE',
        contactEmail: 'info@example.com',
        contactPhone: '+20 000 000 0000',
        website: resolveTenantEmailWebsite(
          'elgounaexcursions.com',
          'https://egypt-excursionsonline.com',
        ),
      },
    });

    const sent = mockSendEmail.mock.calls[0][0] as { html: string };
    expect(sent.html).toContain('src="https://elgounaexcursions.com/tenants/el-gouna/logo.png"');
    expect(sent.html).not.toContain('src="https://egypt-excursionsonline.com/tenants/el-gouna/logo.png"');
  });
});
