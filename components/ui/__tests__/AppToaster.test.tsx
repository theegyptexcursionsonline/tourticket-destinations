import { act, render, screen } from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import toast from 'react-hot-toast';
import AppToaster from '../AppToaster';

describe('AppToaster', () => {
  afterEach(() => {
    act(() => {
      toast.remove();
    });
  });

  it('renders notifications above booking drawers with a mobile-safe width', async () => {
    const { container } = render(<AppToaster />);

    act(() => {
      toast.error('Please select a time to continue', { duration: Infinity });
    });

    const status = await screen.findByRole('status');
    const layer = container.querySelector<HTMLElement>('div[style*="z-index: 2147483000"]');

    expect(layer).not.toBeNull();
    expect(Number(layer?.style.zIndex)).toBeGreaterThan(999_999);
    expect(status).toHaveTextContent('Please select a time to continue');
    expect(screen.getByRole('button', { name: 'Dismiss notification' })).toBeInTheDocument();
  });

  it('keeps responsive width and direction in the shared configuration', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'components/ui/AppToaster.tsx'), 'utf8');
    expect(source).toContain("minWidth: 'min(320px, calc(100vw - 24px))'");
    expect(source).toContain("maxWidth: 'min(430px, calc(100vw - 24px))'");
    expect(source).toContain('direction,');
  });
});
