import { z } from 'zod';
import { apiErrorSchema } from '@jimo/schemas';
import {
  tokenProvider,
  authGeneration,
  type TokenProvider,
} from '../auth/tokens';
export class ApiClientError extends Error {
  constructor(
    public readonly code: string,
    public readonly status = 0,
    public readonly sessionId?: string,
  ) {
    super(code);
  }
}
export function createApiClient(
  baseUrl: string | undefined,
  fetcher: typeof fetch = fetch,
  auth: () => TokenProvider | null = tokenProvider,
) {
  return async function request<T>(
    path: string,
    schema: z.ZodType<T>,
    options: {
      method?: string;
      body?: unknown;
      locale?: string;
      signal?: AbortSignal;
      timeoutMs?: number;
      expectedUserId?: string;
    } = {},
  ): Promise<T> {
    if (!baseUrl || !/^https?:\/\//.test(baseUrl))
      throw new ApiClientError('API_NOT_CONFIGURED');
    const controller = new AbortController();
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, options.timeoutMs ?? 12_000);
    const cancel = () => controller.abort();
    options.signal?.addEventListener('abort', cancel, { once: true });
    if (options.signal?.aborted) cancel();
    const aborted = new Promise<never>((_resolve, reject) => {
      const fail = () =>
        reject(new ApiClientError(timedOut ? 'TIMEOUT' : 'NETWORK_ERROR'));
      if (controller.signal.aborted) fail();
      else controller.signal.addEventListener('abort', fail, { once: true });
    });
    const provider = auth(),
      generation = authGeneration();
    try {
      const multipart =
        typeof FormData !== 'undefined' && options.body instanceof FormData;
      const send = async (refresh = false) => {
        const token = await Promise.race([
          provider?.getToken(refresh),
          aborted,
        ]);
        if (generation !== authGeneration())
          throw new ApiClientError('IDENTITY_CHANGED', 403);
        // Offline renewal failure is not evidence of a revoked session.
        if (provider && !token) throw new ApiClientError('TOKEN_UNAVAILABLE');
        return fetcher(`${baseUrl.replace(/\/$/, '')}${path}`, {
          method: options.method ?? 'GET',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            'x-jimo-locale': options.locale ?? 'en',
            ...(options.expectedUserId
              ? { 'x-jimo-owner': options.expectedUserId }
              : {}),
            ...(options.body === undefined || multipart
              ? {}
              : { 'Content-Type': 'application/json' }),
          },
          ...(options.body === undefined
            ? {}
            : {
                body: multipart
                  ? (options.body as FormData)
                  : JSON.stringify(options.body),
              }),
          signal: controller.signal,
        });
      };
      let response = await Promise.race([send(), aborted]);
      if (response.status === 401 && provider) {
        response = await Promise.race([send(true), aborted]);
      }
      if (generation !== authGeneration())
        throw new ApiClientError('IDENTITY_CHANGED', 403);
      let json: unknown;
      try {
        json = await Promise.race([response.json(), aborted]);
      } catch (error) {
        if (error instanceof ApiClientError) throw error;
        throw new ApiClientError('INVALID_RESPONSE', response.status);
      }
      if (generation !== authGeneration())
        throw new ApiClientError('IDENTITY_CHANGED', 403);
      if (!response.ok) {
        const error = apiErrorSchema.safeParse(json);
        throw new ApiClientError(
          error.success ? error.data.error.code : 'INTERNAL_ERROR',
          response.status,
          error.success ? error.data.error.sessionId : undefined,
        );
      }
      const parsed = schema.safeParse(json);
      if (!parsed.success)
        throw new ApiClientError('INVALID_RESPONSE', response.status);
      return parsed.data;
    } catch (error) {
      if (error instanceof ApiClientError) {
        if (error.status === 401 && generation === authGeneration())
          provider?.unauthorized();
        throw error;
      }
      throw new ApiClientError(timedOut ? 'TIMEOUT' : 'NETWORK_ERROR');
    } finally {
      clearTimeout(timeout);
      options.signal?.removeEventListener('abort', cancel);
    }
  };
}
export const apiRequest = createApiClient(process.env.EXPO_PUBLIC_API_URL);
