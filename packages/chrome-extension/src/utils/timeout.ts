/**
 * Timeout utilities for long-running async operations
 *
 * Prevents operations from hanging indefinitely due to:
 * - Extension reload/update
 * - Network issues
 * - Unresponsive content scripts
 * - Backend timeouts
 */

export class TimeoutError extends Error {
  constructor(operation: string, timeoutMs: number) {
    super(`Operation '${operation}' timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout
 * Rejects with TimeoutError if the operation exceeds the timeout
 *
 * @param promise - The async operation to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operationName - Name of the operation (for error messages)
 * @returns Promise that resolves/rejects based on whichever comes first
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(operationName, timeoutMs));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Standard timeout durations for common operations
 */
export const TIMEOUTS = {
  /** Detect/extract flow (content-script messaging) */
  DETECT: 30_000, // 30 seconds

  /** Extract flow (content-script messaging, may involve scrolling) */
  EXTRACT: 600_000, // 10 minutes (LinkedIn connections can be 1000+)

  /** Import flow (background → backend, multiple batches) */
  IMPORT: 120_000, // 2 minutes

  /** Auth flow (start auth → callback) */
  AUTH: 300_000, // 5 minutes

  /** Company lookup (background → edge function → Scraping-Infra) */
  COMPANY_LOOKUP: 30_000, // 30 seconds

  /** Enrichment status poll (single poll request) */
  ENRICHMENT_POLL: 15_000, // 15 seconds
} as const;
