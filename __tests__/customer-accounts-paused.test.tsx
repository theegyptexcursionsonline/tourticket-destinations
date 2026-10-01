/**
 * Customer sign-in, sign-up and Google sign-in on this network authenticate
 * only through a suspended Google/Firebase project, so every attempt fails.
 * Until accounts move to the platform's own sign-in, the storefront must not
 * offer forms or buttons that cannot work. It explains the pause calmly and
 * gives the real next steps: find the booking by its reference, reach the
 * team, or book as a guest — never a dead end.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react';
import { customerAccountsEnabled } from '@/lib/auth/customerAccounts';
import AccountsUnavailableNotice, { AccountsUnavailableDialog } from '@/components/auth/AccountsUnavailableNotice';
import LoginPage from '@/app/[locale]/login/page';
import SignupPage from '@/app/[locale]/signup/page';
import ForgotPasswordPage from '@/app/[locale]/forgot/page';
import UserLayout from '@/app/[locale]/user/layout';
import AuthModal from '@/components/AuthModal';
import { CustomerTypeSelector } from '@/app/[locale]/checkout/CheckoutClientPage';

const mockPush = jest.fn();
jest.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, onClick, ...props }: { children: React.ReactNode; href: string; onClick?: () => void }) => (
    <a href={href} onClick={(event) => { event.preventDefault(); onClick?.(); }} {...props}>{children}</a>
  ),
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/login',
  redirect: jest.fn(),
  getPathname: jest.fn(),
}));

let mockTenant: Record<string, unknown> | null = { tenantId: 'default', contact: { email: 'info@egypt-excursionsonline.com', phone: '+20 000 000 0000' } };
jest.mock('@/contexts/TenantContext', () => ({
  useTenant: () => ({ tenant: mockTenant, tenantId: (mockTenant?.tenantId as string) ?? 'default', isLoading: false }),
}));

jest.mock('@/lib/tenant', () => ({
  getTenantFromRequest: jest.fn(async () => 'hurghada-excursions-online'),
  getTenantPublicConfig: jest.fn(async () => ({ name: 'Hurghada Excursions Online' })),
}));
jest.mock('@/components/Header', () => ({ __esModule: true, default: () => <header>site header</header> }));
jest.mock('@/components/Footer', () => ({ __esModule: true, default: () => <footer>site footer</footer> }));
jest.mock('@/components/user/UserSidebar', () => ({ __esModule: true, default: () => <nav>account sidebar</nav> }));
jest.mock('@/components/ProtectedRoute', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="protected">{children}</div>,
}));
jest.mock('@/app/[locale]/login/LoginClient', () => ({ __esModule: true, default: () => <form aria-label="sign in form" /> }));
jest.mock('@/app/[locale]/signup/SignupClient', () => ({ __esModule: true, default: () => <form aria-label="sign up form" /> }));
jest.mock('@/app/[locale]/forgot/ForgotPasswordClient', () => ({ __esModule: true, default: () => <form aria-label="reset form" /> }));

const FLAG = 'NEXT_PUBLIC_CUSTOMER_ACCOUNTS_ENABLED';
const original = process.env[FLAG];
beforeEach(() => {
  mockPush.mockClear();
  mockTenant = { tenantId: 'default', contact: { email: 'info@egypt-excursionsonline.com', phone: '+20 000 000 0000' } };
});
afterEach(() => {
  if (original === undefined) delete process.env[FLAG];
  else process.env[FLAG] = original;
});
const pause = () => { delete process.env[FLAG]; };
const resume = () => { process.env[FLAG] = 'true'; };

describe('customerAccountsEnabled', () => {
  it('is off unless explicitly switched on', () => {
    pause();
    expect(customerAccountsEnabled()).toBe(false);
    for (const value of ['', 'false', '1', 'TRUE', 'yes']) {
      process.env[FLAG] = value;
      expect(customerAccountsEnabled()).toBe(false);
    }
    resume();
    expect(customerAccountsEnabled()).toBe(true);
  });
});

describe('while customer accounts are paused', () => {
  beforeEach(pause);

  it.each([
    ['sign-in', LoginPage, 'sign in form'],
    ['sign-up', SignupPage, 'sign up form'],
    ['password reset', ForgotPasswordPage, 'reset form'],
  ])('the %s page explains the pause and offers the next steps instead of a form', (_label, Page, formName) => {
    render(<Page />);

    expect(screen.getByRole('heading', { level: 1, name: 'title' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: formName })).toBeNull();
    expect(screen.getByLabelText('referenceLabel')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'viewBooking' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'contact' })).toHaveAttribute('href', '/contact');
    expect(screen.getByRole('link', { name: 'browse' })).toHaveAttribute('href', '/tours');
    expect(document.querySelector('input[type="password"]')).toBeNull();
  });

  it('the sign-in pages are not offered to search engines', async () => {
    const { generateMetadata } = await import('@/app/[locale]/login/page');
    await expect(generateMetadata()).resolves.toEqual(
      expect.objectContaining({ robots: expect.objectContaining({ index: false }) }),
    );
  });

  it('"View my booking" links from confirmation e-mails land on the help, not a broken account area', () => {
    render(<UserLayout><p>bookings list</p></UserLayout>);

    expect(screen.getByRole('heading', { level: 1, name: 'title' })).toBeInTheDocument();
    expect(screen.queryByTestId('protected')).toBeNull();
    expect(screen.queryByText('bookings list')).toBeNull();
  });

  it('an account dialog opened anywhere shows the same help and closes cleanly', () => {
    const onClose = jest.fn();
    render(<AuthModal isOpen onClose={onClose} initialMode="login" />);

    const dialog = screen.getByRole('dialog', { name: 'title' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(document.querySelector('input[type="password"]')).toBeNull();
    fireEvent.keyDown(window, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: 'close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('checkout offers guest booking only, with the explanation', () => {
    render(
      <CustomerTypeSelector
        customerType="guest"
        setCustomerType={jest.fn()}
        onLoginClick={jest.fn()}
        onSignupClick={jest.fn()}
      />,
    );

    expect(screen.getByRole('button', { name: /Continue as Guest/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /auth\.login/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /auth\.createAccount/ })).toBeNull();
    expect(screen.getByText('checkoutNote')).toBeInTheDocument();
  });

  it('the header shows no sign-in, sign-up or account menu', () => {
    const header = fs.readFileSync(path.join(process.cwd(), 'components/Header.tsx'), 'utf8');
    const search = fs.readFileSync(path.join(process.cwd(), 'components/Headersearch.tsx'), 'utf8');
    for (const source of [header, search]) {
      expect(source.match(/customerAccountsEnabled\(\) && \(user \? \(/g)).toHaveLength(2);
    }
  });
});

describe('finding a booking without an account', () => {
  const lookup = (value: string) => {
    render(<AccountsUnavailableNotice />);
    fireEvent.change(screen.getByLabelText('referenceLabel'), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: 'viewBooking' }));
  };

  it.each([
    ['HEO-12345678-AB12CD', 'HEO-12345678-AB12CD'],
    ['  heo-12345678-ab12cd ', 'HEO-12345678-AB12CD'],
    ['Booking HEO-12345678-AB12CD', 'HEO-12345678-AB12CD'],
    ['#HEO-12345678-AB12CD', 'HEO-12345678-AB12CD'],
  ])('opens the booking page for %j', (typed, reference) => {
    lookup(typed);
    expect(mockPush).toHaveBeenCalledWith(`/booking/verify/${reference}`);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('asks for the reference when nothing was entered', () => {
    lookup('   ');
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('referenceRequired');
    expect(screen.getByLabelText('referenceLabel')).toHaveAttribute('aria-invalid', 'true');
  });

  it('explains when the text is not a booking reference, and clears the message once the customer types again', () => {
    lookup('my holiday');
    expect(mockPush).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('referenceInvalid');

    fireEvent.change(screen.getByLabelText('referenceLabel'), { target: { value: 'HEO-1' } });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('closes the dialog when it sends the customer to their booking', () => {
    const onClose = jest.fn();
    render(<AccountsUnavailableDialog onClose={onClose} />);
    fireEvent.change(screen.getByLabelText('referenceLabel'), { target: { value: 'HEO-12345678-AB12CD' } });
    fireEvent.click(screen.getByRole('button', { name: 'viewBooking' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/booking/verify/HEO-12345678-AB12CD');
  });
});

describe('reaching the team', () => {
  it("offers the brand's own WhatsApp and e-mail when they are configured", () => {
    mockTenant = { tenantId: 'hurghada-excursions-online', contact: { email: 'hello@brand.example', whatsapp: '+20 114 225 5624' } };
    render(<AccountsUnavailableNotice />);

    expect(screen.getByRole('link', { name: 'whatsapp' })).toHaveAttribute('href', 'https://wa.me/201142255624');
    expect(screen.getByRole('link', { name: 'email' })).toHaveAttribute('href', 'mailto:hello@brand.example');
    expect(screen.getByRole('link', { name: 'contact' })).toHaveAttribute('href', '/contact');
  });

  it('never shows placeholder or fallback contact details', () => {
    mockTenant = { tenantId: 'hurghada-excursions-online', contact: { email: '', whatsapp: '+20 000 000 0000' } };
    const { unmount } = render(<AccountsUnavailableNotice />);
    expect(screen.queryByRole('link', { name: 'whatsapp' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'email' })).toBeNull();
    unmount();

    mockTenant = { tenantId: 'default', contact: { email: 'info@egypt-excursionsonline.com', whatsapp: '+20 114 225 5624' } };
    render(<AccountsUnavailableNotice />);
    expect(screen.queryByRole('link', { name: 'whatsapp' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'email' })).toBeNull();
    expect(screen.getByRole('link', { name: 'contact' })).toBeInTheDocument();
  });
});

describe('once customer accounts are switched back on', () => {
  beforeEach(resume);

  it('the account pages render their forms again', () => {
    render(<LoginPage />);
    expect(screen.getByRole('form', { name: 'sign in form' })).toBeInTheDocument();
  });

  it('checkout offers sign-in and account creation again', () => {
    render(
      <CustomerTypeSelector
        customerType="guest"
        setCustomerType={jest.fn()}
        onLoginClick={jest.fn()}
        onSignupClick={jest.fn()}
      />,
    );
    expect(screen.getAllByRole('button')).toHaveLength(3);
    expect(screen.queryByText('checkoutNote')).toBeNull();
  });

  it('the account area is protected as before', () => {
    render(<UserLayout><p>bookings list</p></UserLayout>);
    expect(screen.getByTestId('protected')).toHaveTextContent('bookings list');
  });
});

describe('the explanation copy', () => {
  const KEYS = [
    'title', 'intro', 'findTitle', 'referenceLabel', 'referenceHelp', 'referenceRequired', 'referenceInvalid',
    'viewBooking', 'changeTitle', 'changeBody', 'whatsapp', 'email', 'contact', 'guestTitle', 'guest', 'browse',
    'close', 'checkoutNote',
  ];
  const LOCALES = fs.readdirSync(path.join(process.cwd(), 'messages')).filter((file) => file.endsWith('.json'));
  const copyFor = (file: string) =>
    JSON.parse(fs.readFileSync(path.join(process.cwd(), 'messages', file), 'utf8')).auth.accountsPaused;

  it('covers every storefront language', () => {
    expect(LOCALES.sort()).toEqual(['ar.json', 'de.json', 'en.json', 'es.json', 'fr.json', 'ru.json']);
  });

  it.each(LOCALES)('%s carries every string and no message syntax', (file) => {
    const copy = copyFor(file);
    expect(Object.keys(copy).sort()).toEqual([...KEYS].sort());
    for (const key of KEYS) {
      expect(typeof copy[key] === 'string' && copy[key].trim().length > 0).toBe(true);
      expect(copy[key]).not.toMatch(/[{}]|'/);
    }
  });

  it('reads naturally in English and points customers to where the reference is', () => {
    const copy = copyFor('en.json');
    expect(copy.title).toBe('Sign-in is temporarily unavailable');
    expect(copy.intro).toMatch(/^Your bookings are not affected/);
    expect(copy.referenceHelp).toMatch(/“Booking” at the top of your confirmation e-mail/);
    expect(copy.guest).toMatch(/book any tour as a guest/);
  });

  it.each(LOCALES)('%s exposes no internal or technical vocabulary', (file) => {
    const text = Object.values(copyFor(file)).join(' ');
    // Whole words only: "réserver" must not trip over "server".
    expect(text).not.toMatch(
      /(?<!\p{L})(firebase|google|provider|suspend\p{L}*|outage|incident|server|api|error|bug|token|session)(?!\p{L})/iu,
    );
  });

  it('the dialog closes when its backdrop is clicked but not when its card is', () => {
    const onClose = jest.fn();
    render(<AccountsUnavailableDialog onClose={onClose} />);
    fireEvent.click(screen.getByRole('heading', { level: 2, name: 'title' }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
