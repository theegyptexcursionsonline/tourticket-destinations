import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import UnpricedOptionsWarning from '../UnpricedOptionsWarning';

describe('tour editor notice for options with no price', () => {
  it('lists each unpriced option by name and says the tour can still be saved', () => {
    render(<UnpricedOptionsWarning options={[
      { label: 'Private Tour with Transfers', price: 60 },
      { label: 'Private Cairo Experience', price: 0, timeSlots: [{ time: '10:00' }] },
    ]} />);
    const notice = screen.getByTestId('unpriced-options-warning');
    expect(notice).toHaveAttribute('role', 'status');
    expect(within(notice).getByText('1 booking option has no price')).toBeInTheDocument();
    expect(within(notice).getByText('Private Cairo Experience')).toBeInTheDocument();
    expect(within(notice).queryByText('Private Tour with Transfers')).not.toBeInTheDocument();
    expect(notice).toHaveTextContent('You can still save the tour as it is.');
  });

  it('counts several unpriced options', () => {
    render(<UnpricedOptionsWarning options={[{ label: 'A', price: '' }, { label: 'B', price: 0 }]} />);
    expect(screen.getByText('2 booking options have no price')).toBeInTheDocument();
  });

  it('renders nothing when every option is priced, or there are none', () => {
    const { container, rerender } = render(<UnpricedOptionsWarning options={[{ label: 'A', price: 0, timeSlots: [{ price: 40 }] }]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<UnpricedOptionsWarning options={[]} />);
    expect(container).toBeEmptyDOMElement();
    rerender(<UnpricedOptionsWarning options={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('the tour form shows the notice and never blocks the save on it', () => {
  const form = fs.readFileSync(path.join(process.cwd(), 'components', 'TourForm.tsx'), 'utf8');

  it('shows the notice on the booking tab and above the save buttons on every other tab', () => {
    expect(form).toContain('<UnpricedOptionsWarning options={formData.bookingOptions} />');
    expect(form).toMatch(/activeTab !== 'booking' && \(\s*<UnpricedOptionsWarning options=\{formData\.bookingOptions\} className="mb-4" \/>/);
  });

  it('reports the saved warning after both the tour save and the single option save', () => {
    expect(form).toContain('showUnpricedOptionsNotice(responseData?.warnings?.unpricedOptions)');
    expect(form).toContain('showUnpricedOptionsNotice(saved?.warnings?.unpricedOptions)');
    // A warning is never an error path: it must not sit behind a failed response.
    expect(form).not.toMatch(/unpriced[^\n]*toast\.error/i);
  });
});
