import { render } from '@testing-library/react';
import ClientErrorReporter from '../ClientErrorReporter';

describe('ClientErrorReporter', () => {
  let consoleError: jest.SpyInstance;
  let sendBeacon: jest.Mock;

  beforeEach(() => {
    consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    sendBeacon = jest.fn(() => true);
    Object.defineProperty(navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon,
    });
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it.each([
    'ResizeObserver loop completed with undelivered notifications.',
    'ResizeObserver loop limit exceeded',
  ])('silences the benign browser ResizeObserver notification: %s', (message) => {
    render(<ClientErrorReporter />);

    const event = new ErrorEvent('error', {
      cancelable: true,
      message,
    });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(consoleError).not.toHaveBeenCalled();
    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('continues reporting actionable client errors', () => {
    render(<ClientErrorReporter />);

    window.dispatchEvent(new ErrorEvent('error', {
      message: 'Actionable application failure',
      filename: 'app.js',
      lineno: 10,
      colno: 4,
    }));

    expect(consoleError).toHaveBeenCalledWith(
      '[ClientError]',
      expect.objectContaining({
        type: 'unhandled_error',
        message: 'Actionable application failure',
      }),
    );
    expect(sendBeacon).toHaveBeenCalledTimes(1);
  });
});

