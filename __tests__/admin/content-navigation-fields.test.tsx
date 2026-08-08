import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import ContentNavigationFields from '@/components/admin/ContentNavigationFields';

describe('ContentNavigationFields', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    }) as jest.Mock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the current brand root as Home and lets an editor explicitly select it', () => {
    const onParentPageChange = jest.fn();
    render(
      <ContentNavigationFields
        breadcrumbLabel=""
        parentPage={null}
        onBreadcrumbLabelChange={jest.fn()}
        onParentPageChange={onParentPageChange}
        tenantId="marsa-alam-excursions"
      />,
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('/ · Main website')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change parent page. Current: Home' }));
    fireEvent.click(screen.getByRole('button', { name: /Home \/ · Main website Root/i }));
    expect(onParentPageChange).toHaveBeenCalledWith(null);
  });

  it('returns a nested item to Home without inventing a home URL record', () => {
    const onParentPageChange = jest.fn();
    render(
      <ContentNavigationFields
        breadcrumbLabel=""
        parentPage={{ id: 'destination-id', slug: 'marsa-alam', label: 'Marsa Alam', kind: 'destination' }}
        onBreadcrumbLabelChange={jest.fn()}
        onParentPageChange={onParentPageChange}
        tenantId="marsa-alam-excursions"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Use Home as parent page' }));
    expect(onParentPageChange).toHaveBeenCalledWith(null);
  });

  it('is shared by every editor covered by the request', () => {
    const files = [
      'components/TourForm.tsx',
      'app/admin/destinations/DestinationManager.tsx',
      'components/admin/CategoryForm.tsx',
      'components/admin/AttractionPageForm.tsx',
    ];
    for (const file of files) {
      expect(readFileSync(join(process.cwd(), file), 'utf8')).toContain('<ContentNavigationFields');
    }
  });
});
