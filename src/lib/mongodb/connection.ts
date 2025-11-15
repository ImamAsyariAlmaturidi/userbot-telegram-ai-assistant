import mongoose from "mongoose";

let isConnected = false;
let connectionPromise: Promise<typeof mongoose> | null = null;

/**
 * Connect to MongoDB with robust error handling and connection pooling
 */
export async function connectMongoDB(): Promise<typeof mongoose> {
  // Return existing connection if already connected
  if (isConnected && mongoose.connection.readyState === 1) {
    return mongoose;
  }

  // Return existing promise if connection is in progress
  if (connectionPromise) {
    return connectionPromise;
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI is not defined in environment variables. Please set it to your MongoDB connection string."
    );
  }

  // Create connection promise
  connectionPromise = mongoose
    .connect(mongoUri, {
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
      maxConnecting: 10,
      maxIdleTimeMS: 10000,
    })
    .then((mongooseInstance: typeof mongoose) => {
      isConnected = true;
      console.log("✅ MongoDB connected successfully");
      return mongooseInstance;
    })
    .catch((error: any) => {
      isConnected = false;
      connectionPromise = null;
      console.error("❌ MongoDB connection error:", error);
      throw error;
    });

  // Handle connection events
  mongoose.connection.on("connected", () => {
    isConnected = true;
    console.log("📡 MongoDB connection established");
  });

  mongoose.connection.on("error", (error: any) => {
    isConnected = false;
    console.error("❌ MongoDB connection error:", error);
  });

  mongoose.connection.on("disconnected", () => {
    isConnected = false;
    console.warn("⚠️ MongoDB disconnected");
  });

  // Handle process termination
  process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("MongoDB connection closed through app termination");
    process.exit(0);
  });

  return connectionPromise;
}

/**
 * Disconnect from MongoDB
 */
export async function disconnectMongoDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    isConnected = false;
    connectionPromise = null;
    console.log("MongoDB disconnected");
  }
}

/**
 * Check if MongoDB is connected
 */
export function isMongoDBConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}
