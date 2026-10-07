import {
  useQuery,
  useInfiniteQuery,
  type InfiniteData,
} from '@tanstack/react-query';
import type { z } from 'zod';
import { useApiLocale } from '../api/queries';
import { apiRequest } from '../api/client';
import { useOffline } from '../db/Provider';
import { loadProgress, type ProgressResponse } from './cache';
import { deviceTimeZone } from './helpers';
export function useProgressQuery<T>(
  path: string,
  schema: z.ZodType<T>,
  params: Record<string, string | undefined> = {},
  enabled = true,
) {
  const { runtime } = useOffline(),
    locale = useApiLocale(),
    owner = runtime.owner;
  const search = new URLSearchParams(
    Object.entries(params).filter(
      (e): e is [string, string] => e[1] !== undefined,
    ),
  ).toString();
  const url = path + (search ? `?${search}` : ''),
    key = `${process.env.EXPO_PUBLIC_API_URL ?? ''}:${locale}:${url}`;
  return useQuery({
    queryKey: ['progress', owner, key],
    enabled: !!owner && enabled,
    networkMode: 'always',
    retry: false,
    staleTime: 60_000,
    queryFn: () =>
      loadProgress({
        owner: owner!,
        key,
        schema,
        cache: runtime.progress,
        online: runtime.online,
        currentOwner: () => runtime.owner,
        fetch: () =>
          apiRequest(url, schema, { locale, expectedUserId: owner! }),
      }),
  });
}
export function usePendingProgress() {
  const { runtime } = useOffline();
  return useQuery({
    queryKey: ['local', runtime.owner, 'progress-pending'],
    networkMode: 'always',
    queryFn: async () =>
      runtime.owner
        ? (await runtime.outbox.list(runtime.owner)).length > 0
        : false,
  });
}
export function progressParams(range: string) {
  return { range, timeZone: deviceTimeZone() };
}
export function useProgressPages<T>(
  path: string,
  schema: z.ZodType<T>,
  params: Record<string, string | undefined>,
  cursorOf: (payload: T) => string | null,
  cursorParams: (cursor: string) => Record<string, string> = (cursor) => ({
    cursor,
  }),
) {
  const { runtime } = useOffline(),
    owner = runtime.owner,
    locale = useApiLocale();
  const search = new URLSearchParams(
    Object.entries(params).filter(
      (e): e is [string, string] => e[1] !== undefined,
    ),
  ).toString();
  return useInfiniteQuery<
    ProgressResponse<T>,
    Error,
    InfiniteData<ProgressResponse<T>>,
    readonly unknown[],
    string | undefined
  >({
    queryKey: ['progress', owner, locale, path, search, 'pages'],
    enabled: !!owner,
    networkMode: 'always',
    retry: false,
    staleTime: 60_000,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => cursorOf(last.payload) ?? undefined,
    queryFn: ({ pageParam }) => {
      const next = new URLSearchParams(search);
      if (pageParam)
        for (const [key, value] of Object.entries(cursorParams(pageParam)))
          next.set(key, value);
      const url = `${path}?${next.toString()}`,
        key = `${process.env.EXPO_PUBLIC_API_URL ?? ''}:${locale}:${url}`;
      return loadProgress({
        owner: owner!,
        key,
        schema,
        cache: runtime.progress,
        online: runtime.online,
        currentOwner: () => runtime.owner,
        fetch: () =>
          apiRequest(url, schema, { locale, expectedUserId: owner! }),
      });
    },
  });
}
