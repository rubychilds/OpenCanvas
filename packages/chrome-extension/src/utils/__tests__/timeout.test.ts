/**
 * Tests for timeout utility - ensuring operations fail cleanly on timeout
 */

import { describe, it, expect, vi } from 'vitest';
import { withTimeout, TimeoutError, TIMEOUTS } from '../timeout';

describe('withTimeout', () => {
  it('should resolve if promise completes before timeout', async () => {
    const promise = Promise.resolve('success');

    const result = await withTimeout(promise, 1000, 'test operation');

    expect(result).toBe('success');
  });

  it('should reject with TimeoutError if promise exceeds timeout', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => resolve('too late'), 200);
    });

    await expect(
      withTimeout(promise, 50, 'slow operation')
    ).rejects.toThrow(TimeoutError);

    await expect(
      withTimeout(promise, 50, 'slow operation')
    ).rejects.toThrow("Operation 'slow operation' timed out after 50ms");
  });

  it('should reject with original error if promise rejects before timeout', async () => {
    const error = new Error('Original error');
    const promise = Promise.reject(error);

    await expect(
      withTimeout(promise, 1000, 'test operation')
    ).rejects.toThrow('Original error');
  });

  it('should clean up timeout if promise resolves', async () => {
    vi.useFakeTimers();

    const promise = Promise.resolve('fast');
    const result = await withTimeout(promise, 1000, 'test operation');

    expect(result).toBe('fast');

    // Advance timers to ensure timeout was cleared
    vi.advanceTimersByTime(2000);

    vi.useRealTimers();
  });

  it('should clean up timeout if promise rejects', async () => {
    vi.useFakeTimers();

    const promise = Promise.reject(new Error('fast fail'));

    await expect(
      withTimeout(promise, 1000, 'test operation')
    ).rejects.toThrow('fast fail');

    // Advance timers to ensure timeout was cleared
    vi.advanceTimersByTime(2000);

    vi.useRealTimers();
  });
});

describe('TimeoutError', () => {
  it('should create error with correct message', () => {
    const error = new TimeoutError('fetch data', 5000);

    expect(error.message).toBe("Operation 'fetch data' timed out after 5000ms");
    expect(error.name).toBe('TimeoutError');
    expect(error).toBeInstanceOf(Error);
  });
});

describe('TIMEOUTS constants', () => {
  it('should have reasonable timeout values', () => {
    expect(TIMEOUTS.DETECT).toBe(30_000); // 30 seconds
    expect(TIMEOUTS.EXTRACT).toBe(30_000); // 30 seconds
    expect(TIMEOUTS.IMPORT).toBe(120_000); // 2 minutes
    expect(TIMEOUTS.AUTH).toBe(300_000); // 5 minutes
  });
});
