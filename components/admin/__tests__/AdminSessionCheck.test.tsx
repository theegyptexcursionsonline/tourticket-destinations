import { act, render, screen, waitFor } from '@testing-library/react';
import AdminSessionCheck from '@/components/admin/AdminSessionCheck';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

const router = { refresh: jest.fn(), replace: jest.fn() };
jest.mock('next/navigation', () => ({ useRouter: () => router }));
jest.mock('@/contexts/AdminAuthContext', () => ({ useAdminAuth: jest.fn() }));

const adminAuth = useAdminAuth as jest.Mock;
let refreshUser: jest.Mock;

function session(overrides: Record<string, unknown> = {}) {
  adminAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, refreshUser, ...overrides });
}

beforeEach(() => {
  jest.clearAllMocks();
  refreshUser = jest.fn(() => Promise.resolve());
  session();
  window.history.replaceState({}, '', '/blog');
});

describe('AdminSessionCheck (the sign-in screen the proxy renders without a session)', () => {
  it('holds no data and waits while the browser is signed out', () => {
    render(<AdminSessionCheck />);

    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(router.refresh).not.toHaveBeenCalled();
  });

  it('renders the requested page once the admin signs in — exactly once', async () => {
    const { rerender } = render(<AdminSessionCheck />);
    session({ isAuthenticated: true });
    rerender(<AdminSessionCheck />);
    rerender(<AdminSessionCheck />);

    await waitFor(() => expect(router.refresh).toHaveBeenCalledTimes(1));
  });

  it('re-checks the session when the server still refuses it, then offers a reload', async () => {
    session({ isAuthenticated: true });
    render(<AdminSessionCheck />);

    await waitFor(() => expect(refreshUser).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('alert')).toHaveTextContent('This page could not be opened');
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
  });

  it('does nothing until the session finished loading', async () => {
    session({ isAuthenticated: true, isLoading: true });
    render(<AdminSessionCheck />);
    await act(async () => undefined);

    expect(router.refresh).not.toHaveBeenCalled();
  });

  it.each([
    ['/sign-in', '/'],
    ['/admin/sign-in', '/admin'],
  ])('opened at %s while signed in, it goes to the dashboard', async (address, dashboard) => {
    window.history.replaceState({}, '', address);
    session({ isAuthenticated: true });
    render(<AdminSessionCheck />);

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(dashboard));
    expect(router.refresh).not.toHaveBeenCalled();
  });
});
