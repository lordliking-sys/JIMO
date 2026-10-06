import { z } from 'zod';
import { apiErrorSchema } from '@jimo/schemas';
export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 0,
  ) {
    super(code);
  }
}
export function createApiClient(
  baseUrl: string | undefined,
  fetcher: typeof fetch = fetch,
) {
  return async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: {
      method?: string;
      body?: unknown;
      locale?: string;
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    if (!baseUrl || !/^https?:\/\//.test(baseUrl))
      throw new ApiClientError('API_NOT_CONFIGURED');
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 12_000);
    const cancel = () => controller.abort();
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) cancel();
    try {
      const response = await fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          'x-jimo-locale': options.locale ?? 'en',
          ...(options.body === undefined
            ? {}
            : { 'Content-Type': 'application/json' }),
        },
        ...(options.body === undefined
          ? {}
          : { body: JSON.stringify(options.body) }),
        signal: controller.signal,
      });
      let json: unknown;
      try {
        json = await response.json();
      } catch {
        throw new ApiClientError('INVALID_RESPONSE', response.status);
      }
      if (!response.ok) {
        const error = apiErrorSchema.safeParse(json);
        throw new ApiClientError(
          error.success ? error.data.error.code : 'INTERNAL_ERROR',
          response.status,
        );
      }
      const parsed = schema.safeParse(json);
      if (!parsed.success)
        throw new ApiClientError('INVALID_RESPONSE', response.status);
      return parsed.data;
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      throw new ApiClientError(timedOut ? 'TIMEOUT' : 'NETWORK_ERROR');
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', cancel);
    }
  };
}
export const apiRequest = createApiClient(process.env.EXPO_PUBLIC_API_URL);
