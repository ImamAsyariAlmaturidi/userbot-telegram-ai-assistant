/**
 * Retry utility for Prisma operations
 * Helps handle transient database connection errors
 */

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (error: any, attempt: number) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  retryDelay: 1000,
  onRetry: () => {},
};

/**
 * Retry a Prisma operation with exponential backoff
 */
export async function retryPrismaOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries, retryDelay, onRetry } = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Check if it's a connection error that should be retried
      const isConnectionError =
        error?.code === "P1001" || // Can't reach database server
        error?.code === "P1017" || // Server has closed the connection
        error?.code === "P1031" || // Server connection lost
        error?.code === "ETIMEDOUT" ||
        error?.code === "ECONNREFUSED" ||
        error?.code === "ENOTFOUND";

      // Don't retry on last attempt or if it's not a connection error
      if (attempt === maxRetries || !isConnectionError) {
        throw error;
      }

      // Calculate exponential backoff delay
      const delay = retryDelay * Math.pow(2, attempt);
      onRetry(error, attempt + 1);

      console.warn(
        `[Prisma Retry] Attempt ${
          attempt + 1
        }/${maxRetries} failed, retrying in ${delay}ms...`,
        error?.code
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
