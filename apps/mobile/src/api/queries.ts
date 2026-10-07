import { useOffline } from '../db/Provider';
import { useRef } from 'react';
import {
  QueryClient,
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { programsApi } from './programs';
import { exercisesApi } from './exercises';
import { ApiClientError } from './client';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) =>
        count < 1 &&
        error instanceof ApiClientError &&
        ['NETWORK_ERROR', 'TIMEOUT'].includes(error.code),
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
export function useApiLocale() {
  const { i18n } = useTranslation();
  return i18n.resolvedLanguage === 'it' ? 'it' : 'en';
}
export function usePrograms() {
  const locale = useApiLocale(),
    { runtime } = useOffline();
  return useQuery({
    queryKey: ['programs', runtime.owner, locale],
    queryFn: ({ signal }) => programsApi.list(locale, signal),
    enabled: !!runtime.owner,
  });
}
export function useProgram(id: string) {
  const locale = useApiLocale(),
    { runtime } = useOffline();
  return useQuery({
    queryKey: ['program', runtime.owner, id, locale],
    queryFn: ({ signal }) => programsApi.detail(id, locale, signal),
    enabled: !!id && !!runtime.owner,
  });
}
export function useExercise(id: string) {
  const locale = useApiLocale(),
    { runtime } = useOffline();
  return useQuery({
    queryKey: ['exercise', runtime.owner, id, locale],
    queryFn: ({ signal }) => exercisesApi.get(id, locale, signal),
    enabled: !!id && !!runtime.owner,
  });
}
export function useExercises(search: string) {
  const locale = useApiLocale(),
    { runtime } = useOffline();
  return useInfiniteQuery({
    queryKey: ['exercises', runtime.owner, locale, search],
    enabled: !!runtime.owner,
    initialPageParam: null as string | null,
    queryFn: ({ signal, pageParam }) =>
      exercisesApi.list(locale, search, pageParam, signal),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}
export function useProgramMutation<T>(
  action: (input: T) => ReturnType<typeof programsApi.detail>,
) {
  const { runtime } = useOffline();
  const cache = useQueryClient(),
    submitting = useRef(false);
  const mutation = useMutation({
    mutationFn: action,
    onSettled: () => {
      submitting.current = false;
    },
    onSuccess: async () => {
      void runtime.engine.request(true);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['programs'] }),
        cache.invalidateQueries({ queryKey: ['program'] }),
      ]);
    },
  });
  const mutate: typeof mutation.mutate = (...args) => {
    if (submitting.current) return;
    submitting.current = true;
    mutation.mutate(...args);
  };
  return { ...mutation, mutate };
}
