import { connectWithTransientRetry, isTransientMongoConnectionError } from '@/lib/mongoConnectionPolicy';

describe('MongoDB connection retry classification', () => {
  test.each([
    ['MongoNetworkError', 'Client network socket disconnected before secure TLS connection was established'],
    ['MongooseServerSelectionError', 'Server selection timed out after 10000 ms'],
    ['Error', 'read ECONNRESET'],
  ])('retries transient %s failures', (name, message) => {
    const error = new Error(message); error.name = name;
    expect(isTransientMongoConnectionError(error)).toBe(true);
  });
  it('does not retry configuration or authentication failures', () => {
    expect(isTransientMongoConnectionError(new Error('Authentication failed.'))).toBe(false);
    expect(isTransientMongoConnectionError(null)).toBe(false);
  });
  it('retries only once for a transient TLS failure', async () => {
    const error = Object.assign(new Error('secure TLS connection failed'), { name: 'MongoNetworkError' });
    const connect = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce('connected');
    await expect(connectWithTransientRetry(connect, async () => undefined)).resolves.toBe('connected');
    expect(connect).toHaveBeenCalledTimes(2);
  });
});
