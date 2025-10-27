/**
 * Common type definitions used throughout the application
 */

/**
 * Result type for operations that can succeed or fail
 * @template T - The type of data returned on success
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Async result type
 */
export type AsyncResult<T> = Promise<Result<T>>;
