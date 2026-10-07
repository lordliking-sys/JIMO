import { useQuery } from '@tanstack/react-query';
import { fetchFeatureConfig, importAvailable } from './config';
export function useImportAvailability() {
  const flag = process.env.EXPO_PUBLIC_AI_IMPORT_ENABLED;
  const url = process.env.EXPO_PUBLIC_API_URL;
  const query = useQuery({
    queryKey: ['features', url, flag],
    queryFn: ({ signal }) => fetchFeatureConfig(url, flag, fetch, signal),
    enabled: flag === 'true',
    retry: false,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  return {
    enabled: importAvailable(flag, query.data),
    pending: flag === 'true' && query.isPending,
  };
}
export function useImportFeature() {
  return useImportAvailability().enabled;
}
