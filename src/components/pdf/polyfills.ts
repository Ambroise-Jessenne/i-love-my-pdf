// The one feature pdf.js's legacy build uses without a fallback: Promise.withResolvers, which Safari only
// has since version 17.4 (2024). Imported before pdf.js, in the page and in pdf.js's worker.
if (typeof Promise.withResolvers !== 'function') {
  Object.defineProperty(Promise, 'withResolvers', {
    configurable: true,
    writable: true,
    value<T>(): PromiseWithResolvers<T> {
      let resolve!: (value: T | PromiseLike<T>) => void;
      let reject!: (reason?: unknown) => void;
      const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    },
  });
}

export {};
