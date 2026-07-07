/**
 * Races `promise` against a `ms` timer. If the timer fires first, the
 * returned promise rejects with `new Error(message)`; the original promise
 * is left to settle on its own (its result is simply ignored).
 *
 * Used around calls that could otherwise hang indefinitely (e.g. an edge
 * function during an outage) so the UI can show an error instead of
 * spinning forever.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}
