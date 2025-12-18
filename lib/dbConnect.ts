// lib/dbConnect.ts
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

import mongoose from 'mongoose';

/**
 * Multi-tenant database connection support
 * 
 * Environment Variables:
 * - MONGODB_URI: Default/main database
 * - MONGODB_URI_SPEEDBOAT: Speedboat tenant database (optional - falls back to MONGODB_URI)
 * - MONGODB_URI_{TENANT_ID}: Custom database for any tenant
 * 
 * Usage:
 * - dbConnect() - connects to default database
 * - dbConnect('hurghada-speedboat') - connects to speedboat database if configured
 */

// Separate connection cache per database URI
interface ConnectionCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Global cache for multiple database connections
let connectionCaches: Record<string, ConnectionCache> = (global as any).mongooseConnections || {};
if (!(global as any).mongooseConnections) {
  (global as any).mongooseConnections = connectionCaches;
}

// Legacy single connection cache for backward compatibility
let cached = (global as any).mongoose;
if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

/**
 * Get the MongoDB URI for a specific tenant
 * Priority: Tenant-specific env var > Default env var
 */
function getMongoURIForTenant(tenantId?: string): string {
  // If tenant specified, check for tenant-specific database
  if (tenantId) {
    // Convert tenant ID to env var format: hurghada-speedboat -> SPEEDBOAT
    const tenantEnvKey = tenantId.toUpperCase().replace(/-/g, '_').replace('HURGHADA_', '');
    const tenantUri = process.env[`MONGODB_URI_${tenantEnvKey}`];
    
    if (tenantUri) {
      console.log(`Using tenant-specific database for: ${tenantId}`);
      return tenantUri;
    }
    
    // Also try the full tenant ID format
    const fullTenantUri = process.env[`MONGODB_URI_${tenantId.toUpperCase().replace(/-/g, '_')}`];
    if (fullTenantUri) {
      console.log(`Using tenant-specific database for: ${tenantId}`);
      return fullTenantUri;
    }
  }
  
  // Fall back to default database
  const defaultUri = process.env.MONGODB_URI;
  if (!defaultUri) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  }
  
  return defaultUri;
}

/**
 * Connect to database
 * @param tenantId - Optional tenant ID to use tenant-specific database
 */
async function dbConnect(tenantId?: string) {
  const MONGODB_URI = getMongoURIForTenant(tenantId);
  
  // Create cache key based on URI (to support multiple databases)
  const cacheKey = MONGODB_URI;
  
  // Initialize cache for this URI if not exists
  if (!connectionCaches[cacheKey]) {
    connectionCaches[cacheKey] = { conn: null, promise: null };
  }
  
  const cache = connectionCaches[cacheKey];
  
  if (cache.conn) {
    return cache.conn;
  }

  if (!cache.promise) {
    const opts = {
      bufferCommands: false,
      // Increased timeouts for build process (handles 300+ concurrent static pages)
      maxPoolSize: 50, // Increased for build-time concurrent connections
      serverSelectionTimeoutMS: 30000, // 30 seconds (was 5s - too short for builds)
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000, // Add explicit connect timeout
      family: 4, // Use IPv4, skip trying IPv6
    };

    cache.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      const dbName = mongoose.connection.db?.databaseName || 'unknown';
      console.log(`Database connected successfully: ${dbName}${tenantId ? ` (tenant: ${tenantId})` : ''}`);
      return mongoose;
    }).catch((error) => {
      // Reset promise on connection failure to allow retry
      cache.promise = null;
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    });
  }

  try {
    cache.conn = await cache.promise;
    
    // Also update legacy cache for backward compatibility
    cached.conn = cache.conn;
    cached.promise = cache.promise;
    
    // Ensure all models are loaded - this is crucial for proper model registration
    // Core Models
    if (!mongoose.models.User) {
      require('./models/user');
    }
    
    if (!mongoose.models.Tour) {
      require('./models/Tour');
    }
    
    if (!mongoose.models.Destination) {
      require('./models/Destination');
    }
    
    if (!mongoose.models.Category) {
      require('./models/Category');
    }
    
    if (!mongoose.models.Review) {
      require('./models/Review');
    }
    
    if (!mongoose.models.Booking) {
      require('./models/Booking');
    }
    
    if (!mongoose.models.Blog) {
      require('./models/Blog');
    }
    
    // New Models
    if (!mongoose.models.AttractionPage) {
      require('./models/AttractionPage');
    }
    
    if (!mongoose.models.Discount) {
      require('./models/Discount');
    }
    
    if (!mongoose.models.Job) {
      require('./models/Job');
    }
    
    if (!mongoose.models.Otp) {
      require('./models/Otp');
    }
    
    // Tenant Model (Multi-tenant support)
    if (!mongoose.models.Tenant) {
      require('./models/Tenant');
    }
    
    // HeroSettings Model
    if (!mongoose.models.HeroSettings) {
      require('./models/HeroSettings');
    }

    // Log loaded models for debugging (optional - remove in production)
    if (process.env.NODE_ENV === 'development') {
      const modelNames = Object.keys(mongoose.models);
      console.log('Loaded models:', modelNames.join(', '));
    }
    
  } catch (e) {
    cached.promise = null;
    console.error('Database connection error:', e);
    throw e;
  }

  return cached.conn;
}

// Helper function to check connection status
export function getConnectionStatus() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  
  return states[mongoose.connection.readyState as keyof typeof states] || 'unknown';
}

// Helper function to close connection (useful for testing)
export async function closeConnection() {
  if (cached.conn) {
    await mongoose.connection.close();
    cached.conn = null;
    cached.promise = null;
    
    // Also clear all tenant-specific caches
    for (const key of Object.keys(connectionCaches)) {
      connectionCaches[key] = { conn: null, promise: null };
    }
    
    console.log('Database connection closed');
  }
}

/**
 * Check if a tenant has a dedicated database configured
 */
export function hasTenantDatabase(tenantId: string): boolean {
  const tenantEnvKey = tenantId.toUpperCase().replace(/-/g, '_').replace('HURGHADA_', '');
  return !!(
    process.env[`MONGODB_URI_${tenantEnvKey}`] || 
    process.env[`MONGODB_URI_${tenantId.toUpperCase().replace(/-/g, '_')}`]
  );
}

/**
 * Get database info for debugging
 */
export function getDatabaseInfo() {
  const connections = Object.keys(connectionCaches).map(uri => ({
    uri: uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@'), // Mask credentials
    connected: connectionCaches[uri].conn !== null,
  }));
  
  return {
    mainConnected: cached.conn !== null,
    connectionCount: connections.length,
    connections,
  };
}

// Event listeners for connection monitoring
mongoose.connection.on('connected', () => {
  console.log('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeConnection();
  process.exit(0);
});

export default dbConnect;