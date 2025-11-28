// lib/dbConnect.ts
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

import mongoose from 'mongoose';

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cached = (global as any).mongoose;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  // Check for MONGODB_URI at connection time (not at import time)
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    throw new Error(
      'Please define the MONGODB_URI environment variable inside .env.local'
    );
  }
  
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Increased timeouts for build process (handles 300+ concurrent static pages)
      maxPoolSize: 50, // Increased for build-time concurrent connections
      serverSelectionTimeoutMS: 30000, // 30 seconds (was 5s - too short for builds)
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000, // Add explicit connect timeout
      family: 4, // Use IPv4, skip trying IPv6
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('Database connected successfully');
      return mongoose;
    }).catch((error) => {
      // Reset promise on connection failure to allow retry
      cached.promise = null;
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
    
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
    console.log('Database connection closed');
  }
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