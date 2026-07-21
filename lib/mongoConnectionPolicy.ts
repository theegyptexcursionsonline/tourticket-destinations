const TRANSIENT_CONNECTION_ERROR =
  /(Mongo(Network|ServerSelection)Error|MongooseServerSelectionError|ECONNRESET|ETIMEDOUT|EAI_AGAIN|secure TLS connection)/i;

export function isTransientMongoConnectionError(error: unknown): boolean {
  return error instanceof Error && TRANSIENT_CONNECTION_ERROR.test(`${error.name}: ${error.message}`);
}

export async function connectWithTransientRetry<T>(connect: () => Promise<T>, pause: () => Promise<void>): Promise<T> {
  try { return await connect(); } catch (error) {
    if (!isTransientMongoConnectionError(error)) throw error;
    await pause();
    return connect();
  }
}
