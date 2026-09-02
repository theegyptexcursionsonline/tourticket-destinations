import { fireEvent, render, screen } from '@testing-library/react';
import { ToursListClient } from '@/app/admin/tours/ToursListClient';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), refresh: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
jest.mock('@/hooks/useSettings', () => ({
  useSettings: () => ({ selectedCurrency: { code: 'EUR', symbol: '€' } }),
}));
jest.mock('@/contexts/AdminTenantContext', () => ({
  useAdminTenant: () => ({ tenants: [], selectedTenantId: 'brand-a' }),
}));
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn(), promise: jest.fn() },
}));

const tours = [
  { _id: 't-a', title: 'Tour A', slug: 'tour-a', price: 30, isPublished: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
  { _id: 't-b', title: 'Tour B', slug: 'tour-b', price: 10, isPublished: true, createdAt: '2026-02-01T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z' },
  // Never edited since creation: falls back to createdAt under Last Modified.
  { _id: 't-c', title: 'Tour C', slug: 'tour-c', price: 20, isPublished: true, createdAt: '2026-01-15T00:00:00Z' },
  { _id: 't-d', title: 'Tour D', slug: 'tour-d', price: 5, isPublished: false, createdAt: '2025-12-01T00:00:00Z', updatedAt: '2026-04-01T00:00:00Z', archivedAt: '2026-04-02T00:00:00Z' },
];

function visibleOrder(): string[] {
  return screen.getAllByRole('link', { name: /^Tour [A-D]$/ }).map((link) => link.textContent?.trim() || '');
}

describe('ToursListClient sorting', () => {
  it('defaults to newest-created and offers Last Modified', () => {
    render(<ToursListClient tours={tours} />);
    expect(visibleOrder()).toEqual(['Tour B', 'Tour C', 'Tour A']);
    const select = screen.getByDisplayValue('📅 Newest First');
    expect(select).toContainHTML('🕒 Last Modified');
  });

  it('sorts by last modified, falling back to createdAt for never-edited tours', () => {
    render(<ToursListClient tours={tours} />);
    fireEvent.change(screen.getByDisplayValue('📅 Newest First'), { target: { value: 'updated' } });
    expect(visibleOrder()).toEqual(['Tour A', 'Tour B', 'Tour C']);
  });

  it('keeps trashed tours out of the sorted working list and labels their tab Trash', () => {
    render(<ToursListClient tours={tours} />);
    fireEvent.change(screen.getByDisplayValue('📅 Newest First'), { target: { value: 'updated' } });
    expect(screen.queryByRole('link', { name: 'Tour D' })).not.toBeInTheDocument();
    const trashTab = screen.getByRole('button', { name: /^Trash/ });
    expect(trashTab).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Archived/ })).not.toBeInTheDocument();
    fireEvent.click(trashTab);
    expect(visibleOrder()).toEqual(['Tour D']);
  });
});
