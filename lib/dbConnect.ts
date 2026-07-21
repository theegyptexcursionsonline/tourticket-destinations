// Serverless-optimized MongoDB connection shared by all tenants.
import mongoose from 'mongoose';
import { connectWithTransientRetry } from './mongoConnectionPolicy';
export { isTransientMongoConnectionError } from './mongoConnectionPolicy';

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
const globalWithMongoose = global as typeof globalThis & { mongoose?: Cache };
const cached = globalWithMongoose.mongoose ?? (globalWithMongoose.mongoose = { conn: null, promise: null });

function getMongoURI(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI environment variable is not defined');
  return uri;
}

const connectOptions: mongoose.ConnectOptions = {
  bufferCommands: false,
  maxPoolSize: 3,
  minPoolSize: 0,
  maxConnecting: 1,
  maxIdleTimeMS: 60_000,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  socketTimeoutMS: 45_000,
  family: 4,
  heartbeatFrequencyMS: 30_000,
};

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function connectWithRetry(): Promise<typeof mongoose> {
  return connectWithTransientRetry(
    () => mongoose.connect(getMongoURI(), connectOptions),
    () => wait(250 + Math.floor(Math.random() * 250)),
  );
}

async function dbConnect(_tenantId?: string) {
  if (cached.conn && mongoose.connection.readyState === mongoose.ConnectionStates.connected) return cached.conn;
  if (cached.conn && mongoose.connection.readyState !== mongoose.ConnectionStates.connected) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const attempt = connectWithRetry();
    cached.promise = attempt;
    attempt.catch(() => {
      if (cached.promise === attempt) cached.promise = null;
      cached.conn = null;
    });
  }

  const connection = await cached.promise;
  cached.conn = connection;
  loadModels();
  return connection;
}

function loadModels() {
  const models: [string, string][] = [
    ['User', './models/user'], ['Tour', './models/Tour'], ['Destination', './models/Destination'],
    ['Category', './models/Category'], ['Review', './models/Review'], ['Booking', './models/Booking'],
    ['Blog', './models/Blog'], ['AttractionPage', './models/AttractionPage'], ['Discount', './models/Discount'],
    ['Job', './models/Job'], ['Otp', './models/Otp'], ['Tenant', './models/Tenant'], ['HeroSettings', './models/HeroSettings'],
  ];
  for (const [name, path] of models) {
    if (!mongoose.models[name]) {
      try { require(path); } catch { /* model may already be registered */ }
    }
  }
}

export function getConnectionStatus() {
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
}

export async function closeConnection() {
  if (mongoose.connection.readyState !== mongoose.ConnectionStates.disconnected) await mongoose.connection.close();
  cached.conn = null;
  cached.promise = null;
}

export function hasTenantDatabase(tenantId: string): boolean {
  return !!process.env[`MONGODB_URI_${tenantId.toUpperCase().replace(/-/g, '_')}`];
}

export default dbConnect;
