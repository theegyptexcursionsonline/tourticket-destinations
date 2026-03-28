// lib/dbConnect.ts
// Simplified serverless-optimized MongoDB connection for Netlify

import mongoose from 'mongoose';

/**
 * Single shared database for all tenants.
 * Tenant-specific DB override via MONGODB_URI_{TENANT_ID} env var.
 */

// Use global to persist connection across hot reloads (dev) and within
// the same serverless function invocation
const globalWithMongoose = global as typeof globalThis & {
  mongoose: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
};

if (!globalWithMongoose.mongoose) {
  globalWithMongoose.mongoose = { conn: null, promise: null };
}

function getMongoURI(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is not defined');
  }
  return uri;
}

async function dbConnect(_tenantId?: string) {
  // Fast path: already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // If connecting, wait for it
  if (mongoose.connection.readyState === 2 && globalWithMongoose.mongoose.promise) {
    return globalWithMongoose.mongoose.promise;
  }

  // Use cached promise if available (prevents multiple simultaneous connects)
  if (globalWithMongoose.mongoose.promise) {
    try {
      const conn = await globalWithMongoose.mongoose.promise;
      if (mongoose.connection.readyState === 1) {
        return conn;
      }
      // Connection was lost, reset and reconnect
      globalWithMongoose.mongoose.promise = null;
    } catch {
      globalWithMongoose.mongoose.promise = null;
    }
  }

  const MONGODB_URI = getMongoURI();

  const opts: mongoose.ConnectOptions = {
    bufferCommands: false,
    maxPoolSize: 3,               // Very low for serverless
    minPoolSize: 1,
    serverSelectionTimeoutMS: 8000,  // 8s — fail fast
    socketTimeoutMS: 15000,
    connectTimeoutMS: 8000,
    family: 4,
    heartbeatFrequencyMS: 30000,  // Less frequent heartbeats for serverless
  };

  console.log('[DB] Connecting to MongoDB...');

  globalWithMongoose.mongoose.promise = mongoose.connect(MONGODB_URI, opts)
    .then((m) => {
      console.log(`[DB] Connected: ${m.connection.db?.databaseName || 'unknown'}`);
      globalWithMongoose.mongoose.conn = m;
      return m;
    })
    .catch((error) => {
      console.error('[DB] Connection failed:', error.message);
      globalWithMongoose.mongoose.promise = null;
      globalWithMongoose.mongoose.conn = null;
      throw error;
    });

  const conn = await globalWithMongoose.mongoose.promise;

  // Register models once
  loadModels();

  return conn;
}

/**
 * Ensure all Mongoose models are registered (idempotent)
 */
function loadModels() {
  const models: [string, string][] = [
    ['User', './models/user'],
    ['Tour', './models/Tour'],
    ['Destination', './models/Destination'],
    ['Category', './models/Category'],
    ['Review', './models/Review'],
    ['Booking', './models/Booking'],
    ['Blog', './models/Blog'],
    ['AttractionPage', './models/AttractionPage'],
    ['Discount', './models/Discount'],
    ['Job', './models/Job'],
    ['Otp', './models/Otp'],
    ['Tenant', './models/Tenant'],
    ['HeroSettings', './models/HeroSettings'],
  ];

  for (const [name, path] of models) {
    if (!mongoose.models[name]) {
      try {
        require(path);
      } catch (e) {
        // Model may already be registered by import
      }
    }
  }
}

// Connection monitoring (only log once per lifecycle)
let listenersAttached = false;
if (!listenersAttached) {
  mongoose.connection.on('error', (err) => {
    console.error('[DB] Connection error:', err.message);
    // Reset cache on error so next request retries
    globalWithMongoose.mongoose.conn = null;
    globalWithMongoose.mongoose.promise = null;
  });

  mongoose.connection.on('disconnected', () => {
    console.log('[DB] Disconnected');
    globalWithMongoose.mongoose.conn = null;
    globalWithMongoose.mongoose.promise = null;
  });

  listenersAttached = true;
}

// Helper exports
export function getConnectionStatus() {
  const states: Record<number, string> = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
}

export async function closeConnection() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    globalWithMongoose.mongoose.conn = null;
    globalWithMongoose.mongoose.promise = null;
    console.log('[DB] Connection closed');
  }
}

export function hasTenantDatabase(tenantId: string): boolean {
  const envKey = `MONGODB_URI_${tenantId.toUpperCase().replace(/-/g, '_')}`;
  return !!process.env[envKey];
}

export default dbConnect;
