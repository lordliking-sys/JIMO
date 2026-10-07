import { featureConfigSchema, type FeatureConfig } from '@jimo/schemas';
export const disabledFeatures: FeatureConfig = {
  workoutPlanImport: false,
  aiProgramCreation: false,
};
/** Both switches must allow the import. Missing configuration fails closed. */
export function importAvailable(
  flag: string | undefined,
  config?: FeatureConfig,
) {
  return flag === 'true' && config?.workoutPlanImport === true;
}
export async function fetchFeatureConfig(
  baseUrl: string | undefined,
  flag: string | undefined,
  fetcher: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<FeatureConfig> {
  if (flag !== 'true' || !baseUrl || !/^https?:\/\//.test(baseUrl))
    return disabledFeatures;
  const controller = new AbortController();
  const cancel = () => controller.abort();
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  const timeout = setTimeout(cancel, 5000);
  try {
    // Public metadata is independent of login/account generation and tokens.
    const response = await fetcher(`${baseUrl.replace(/\/$/, '')}/features`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) return disabledFeatures;
    const parsed = featureConfigSchema.safeParse(await response.json());
    return parsed.success ? parsed.data : disabledFeatures;
  } catch {
    return disabledFeatures;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}
