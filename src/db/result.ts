/**
 * Generic Result type for safe error handling
 */

export type Ok<T> = { ok: true; data: T };
export type Err<E = Error> = { ok: false; error: E };
export type Result<T, E = Error> = Ok<T> | Err<E>;

/**
 * Helper constructor for Ok result
 */
export function ok<T>(data: T): Ok<T> {
  return { ok: true, data };
}

/**
 * Helper constructor for Err result
 */
export function err<E = Error>(error: E): Err<E> {
  return { ok: false, error };
}

/**
 * Higher-order function that wraps an async callback in try/catch
 * Returns a Promise<Result<T>> with proper error handling
 */
export function safeQuery<T>(callback: () => Promise<T>): Promise<Result<T>> {
  return callback()
    .then(ok)
    .catch((error: unknown) => {
      console.error('[db error]', error);
      return err(error as Error);
    });
}
