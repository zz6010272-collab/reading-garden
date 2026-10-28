export const AUTH_TIMEOUT_MS = 8_000;
export const AUTH_TIMEOUT_MESSAGE = "网络连接超时，请检查网络环境";

export class AuthTimeoutError extends Error {
  constructor() {
    super(AUTH_TIMEOUT_MESSAGE);
    this.name = "AuthTimeoutError";
  }
}

export function withAuthTimeout<T>(
  request: PromiseLike<T>,
  timeoutMs = AUTH_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new AuthTimeoutError()), timeoutMs);
  });

  return Promise.race([Promise.resolve(request), timeout]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}
