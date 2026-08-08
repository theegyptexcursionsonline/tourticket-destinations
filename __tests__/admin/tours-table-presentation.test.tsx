import { fireEvent, render, screen } from '@testing-library/react';
import { CategoryCell } from '@/app/admin/tours/ToursListClient';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('tour table presentation', () => {
  it('collapses several categories into an expandable count', () => {
    render(
      <CategoryCell
        tour={{
          _id: 'tour-1',
          category: [{ name: 'Boat Trips' }, { name: 'Family Tours' }, { title: 'Best Deals' }],
        }}
      />,
    );
    const summary = screen.getByLabelText('Show 3 selected categories');
    expect(summary).toHaveTextContent('3 categories');
    fireEvent.click(summary);
    expect(screen.getByText('Boat Trips')).toBeInTheDocument();
    expect(screen.getByText('Family Tours')).toBeInTheDocument();
    expect(screen.getByText('Best Deals')).toBeInTheDocument();
  });

  it('uses a fixed wide table and wrapping title styles', () => {
    const source = readFileSync(join(process.cwd(), 'app/admin/tours/ToursListClient.tsx'), 'utf8');
    expect(source).toContain('min-w-[960px] table-fixed');
    expect(source).toContain('whitespace-normal break-words');
    expect(source).not.toContain('text-sm font-semibold text-slate-900 truncate');
  });
});
