import { TimeoutError, racePromiseWithTimeout } from './../../../src/utils';

describe('raceTimeout', () => {
  it('should resolve with the promise value if it resolves before the timeout', async () => {
    const value = 'test value';
    const promise = Promise.resolve(value);
    const result = await racePromiseWithTimeout(1000, promise);
    expect(result).toBe(value);
  });

  it("should reject with the promise's rejection reason if it rejects before the timeout", async () => {
    const error = new Error('Test error');
    const promise = Promise.reject(error);
    await expect(racePromiseWithTimeout(1000, promise)).rejects.toBe(error);
  });

  it('should reject with a TimeoutError if the promise takes longer than the timeout', async () => {
    const promise = new Promise((resolve) => {
      setTimeout(() => {
        resolve('success');
      }, 300);
    });

    await expect(racePromiseWithTimeout(200, promise)).rejects.toThrow(TimeoutError);
  });
});
