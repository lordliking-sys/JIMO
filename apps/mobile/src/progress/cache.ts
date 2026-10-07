import type { z } from 'zod';
import type {
  ProgressCacheRepository,
  CachedProgress,
} from '../db/repositories/progress';
export type ProgressResponse<T> = CachedProgress<T> & { stale: boolean };
/** Network errors preserve last known data. Owner changes reject in-flight responses. */
export async function loadProgress<T>(options: {
  owner: string;
  key: string;
  schema: z.ZodType<T>;
  cache: ProgressCacheRepository;
  online: boolean;
  currentOwner: () => string | null;
  fetch: () => Promise<T>;
}): Promise<ProgressResponse<T>> {
  const cached = await options.cache.read(
    options.owner,
    options.key,
    options.schema,
  );
  if (options.currentOwner() !== options.owner)
    throw new Error('IDENTITY_CHANGED');
  if (options.online) {
    try {
      const payload = await options.fetch();
      if (options.currentOwner() !== options.owner)
        throw new Error('IDENTITY_CHANGED');
      const saved = await options.cache.save(
        options.owner,
        options.key,
        payload,
        options.schema,
      );
      return { ...saved, stale: false };
    } catch (error) {
      if (
        options.currentOwner() !== options.owner ||
        (error &&
          typeof error === 'object' &&
          'status' in error &&
          error.status === 403)
      )
        throw error;
      if (cached) return { ...cached, stale: true };
      throw error;
    }
  }
  if (cached) return { ...cached, stale: true };
  throw new Error('PROGRESS_OFFLINE_UNCACHED');
}
