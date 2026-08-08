import { render, screen } from '@testing-library/react';
import LinkedPageCardsSection from '@/components/content/LinkedPageCardsSection';

jest.mock('@/i18n/navigation', () => ({
  Link: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

const pages = [{
  id: 'page-1',
  title: 'Test Guide',
  description: 'A linked page',
  href: '/test-guide',
  kind: 'page' as const,
}];

describe('LinkedPageCardsSection', () => {
  it('renders the editor title and subtitle', () => {
    render(<LinkedPageCardsSection pages={pages} title="Client Picks" subtitle="Chosen for this page" />);
    expect(screen.getByRole('heading', { name: 'Client Picks' })).toBeInTheDocument();
    expect(screen.getByText('Chosen for this page')).toBeInTheDocument();
  });

  it('does not substitute canned copy after the subtitle is deliberately cleared', () => {
    render(<LinkedPageCardsSection pages={pages} title="Client Picks" subtitle="" />);
    expect(screen.queryByText(/Hand-picked guides/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Related guides/i)).not.toBeInTheDocument();
  });

  it('does not render an empty section without curated pages', () => {
    const { container } = render(<LinkedPageCardsSection pages={[]} title="Client Picks" />);
    expect(container).toBeEmptyDOMElement();
  });
});
