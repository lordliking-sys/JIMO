import { readFileSync, existsSync } from 'node:fs';
import { neon, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { EnvHttpProxyAgent, fetch as httpFetch } from 'undici';
import * as tables from './schema';
import * as relations from './relations';

export function isDatabaseUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      ['postgres:', 'postgresql:'].includes(url.protocol) &&
      !!url.hostname &&
      url.pathname.length > 1
    );
  } catch {
    return false;
  }
}

// Preserve certificate verification, including the cloud proxy's trusted CA.
// Each request gets a fresh deadline; the dispatcher belongs to its client.
neonConfig.fetchFunction = (input: RequestInfo | URL, init?: RequestInit) => {
  const signal = init?.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(10_000)])
    : AbortSignal.timeout(10_000);
  return httpFetch(
    input as string,
    { ...init, signal } as unknown as Parameters<typeof httpFetch>[1],
  ) as unknown as ReturnType<typeof fetch>;
};

export function createDatabase(url: string) {
  if (!isDatabaseUrl(url))
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL');
  const caPath = '/etc/ssl/certs/ca-certificates.crt';
  const tls = existsSync(caPath) ? { ca: readFileSync(caPath) } : {};
  const dispatcher = new EnvHttpProxyAgent({ requestTls: tls, proxyTls: tls });
  const sqlClient = neon(url, { fetchOptions: { dispatcher } as RequestInit });
  const db = drizzle(sqlClient, {
    schema: { ...tables, ...relations },
    logger: false,
  });
  return {
    db,
    sqlClient,
    async ping() {
      const [rows] = await sqlClient.transaction(
        [sqlClient.query('SELECT 1 AS ok')],
        { readOnly: true },
      );
      if (rows?.[0]?.ok !== 1)
        throw new Error('Database readiness probe failed');
    },
    close: () => dispatcher.close(),
  };
}
export type DatabaseClient = ReturnType<typeof createDatabase>;
export type Database = DatabaseClient['db'];

/** Never return driver messages, stacks, query parameters or connection URLs. */
export function safeDatabaseError(error: unknown): {
  category: string;
  code?: string;
} {
  const visited = new Set<unknown>();
  let current = error;
  while (current && typeof current === 'object' && !visited.has(current)) {
    visited.add(current);
    if (
      'code' in current &&
      typeof current.code === 'string' &&
      /^[0-9A-Z]{5}$/.test(current.code)
    ) {
      return { category: 'postgres', code: current.code };
    }
    if (
      'name' in current &&
      ['TimeoutError', 'AbortError'].includes(String(current.name))
    )
      return { category: 'timeout' };
    current =
      'cause' in current
        ? current.cause
        : 'sourceError' in current
          ? current.sourceError
          : undefined;
  }
  return { category: 'database_unavailable' };
}
