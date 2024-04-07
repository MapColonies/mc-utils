export async function timeout(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class TimeoutError extends Error {}

export const racePromiseWithTimeout = async <T>(msTimeout: number, promise: Promise<T>): Promise<T> => {
  // Create a promise that rejects in <ms> milliseconds
  const timeout = new Promise<T>((_, reject) => {
    const id = setTimeout(() => {
      clearTimeout(id);
      reject(new TimeoutError(`Timed out in + ${msTimeout} + ms.`));
    }, msTimeout);
  });

  // Returns a race between our timeout and the passed in promise
  return Promise.race([promise, timeout]);
};
