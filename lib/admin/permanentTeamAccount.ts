import mongoose from 'mongoose';

export interface AccountDependencySummary {
  total: number;
  records: Record<string, number>;
}

const BUSINESS_DEPENDENCIES = [
  ['bookings', (id: mongoose.Types.ObjectId, email: string) => ({
    $or: [{ user: id }, { 'editHistory.editedBy': { $in: [String(id), email] } }],
  })],
  ['reviews', (id: mongoose.Types.ObjectId) => ({ user: id })],
  ['stop sale audit records', (id: mongoose.Types.ObjectId) => ({
    $or: [{ appliedBy: id }, { removedBy: id }],
  })],
  ['comments', (_id: mongoose.Types.ObjectId, email: string) => ({ email })],
  ['payment quotes', (_id: mongoose.Types.ObjectId, email: string) => ({ 'customer.email': email })],
  ['newsletter consent', (_id: mongoose.Types.ObjectId, email: string) => ({ normalizedEmail: email })],
  ['newsletter jobs', (_id: mongoose.Types.ObjectId, email: string) => ({ normalizedEmail: email })],
] as const;

const COLLECTIONS = [
  'bookings',
  'reviews',
  'stopsalelogs',
  'comments',
  'checkoutpaymentquotes',
  'newsletterconsents',
  'newsletterproviderjobs',
] as const;

export async function inspectAccountDependencies(
  id: mongoose.Types.ObjectId,
  normalizedEmail: string,
): Promise<AccountDependencySummary> {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection is not ready.');

  const counts = await Promise.all(
    BUSINESS_DEPENDENCIES.map(([, filter], index) =>
      db.collection(COLLECTIONS[index]).countDocuments(filter(id, normalizedEmail))),
  );
  const records = Object.fromEntries(
    BUSINESS_DEPENDENCIES.map(([label], index) => [label, counts[index]]),
  );
  return { total: counts.reduce((sum, count) => sum + count, 0), records };
}

export async function cleanAccountAuthenticationData(normalizedEmail: string) {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database connection is not ready.');
  await Promise.all([
    db.collection('otps').deleteMany({ email: normalizedEmail }),
    db.collection('adminloginaudits').deleteMany({ email: normalizedEmail }),
  ]);
}

