import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import withAuth from '@/components/admin/withAuth';
import { AdminAuthProvider } from '@/contexts/AdminAuthContext';

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/security',
  useRouter: () => ({ replace: jest.fn() }),
}));

jest.mock('@sentry/nextjs', () => ({ captureMessage: jest.fn() }));

jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    dismiss: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

const GuardedPage = withAuth(() => <div>Protected admin page</div>);

describe('admin login two-factor flow', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('keeps the login form mounted while switching from password to the 2FA challenge', async () => {
    let resolveLogin!: (response: Response) => void;
    const loginResponse = new Promise<Response>((resolve) => {
      resolveLogin = resolve;
    });

    const fetchMock = jest.spyOn(global, 'fetch').mockImplementation((input) => {
      const url = String(input);
      if (url === '/api/admin/auth/me') {
        return Promise.resolve({ ok: false } as Response);
      }
      if (url === '/api/admin/login') {
        return loginResponse;
      }
      throw new Error(`Unexpected request: ${url}`);
    });

    render(
      <AdminAuthProvider>
        <GuardedPage />
      </AdminAuthProvider>,
    );

    await screen.findByRole('heading', { name: 'Admin portal access' });
    fireEvent.change(screen.getByLabelText('Work email'), {
      target: { value: 'admin@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'correct-password' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Secure login' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/admin/login',
        expect.objectContaining({ method: 'POST' }),
      );
    });
    expect(screen.getByRole('button', { name: 'Verifying…' })).toBeDisabled();

    resolveLogin({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, requiresTwoFactor: true }),
    } as unknown as Response);

    await screen.findByRole('heading', { name: 'Verify your identity' });
    expect(screen.getByLabelText(/Authentication.*code/i)).toBeVisible();
    expect(screen.getByRole('button', { name: 'Verify and continue' })).toBeDisabled();
  });
});
