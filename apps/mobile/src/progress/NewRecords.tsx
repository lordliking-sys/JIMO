import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text, colors, spacing } from '@jimo/ui';
import { workoutRecordsSchema } from '@jimo/schemas';
import { useProgressQuery, usePendingProgress } from './queries';
import { SectionTitle, RecordRow, CacheNotice } from './components';
export function NewRecords({ sessionId }: { sessionId: string }) {
  const { t } = useTranslation('progress'),
    router = useRouter(),
    pending = usePendingProgress();
  const query = useProgressQuery(
    `/progress/workouts/${sessionId}/records`,
    workoutRecordsSchema,
  );
  return (
    <View style={{ gap: spacing.md }}>
      {pending.data ? (
        <Text variant="caption" color={colors.secondary}>
          {t('pendingSync')}
        </Text>
      ) : null}
      {query.data?.payload.records.length ? (
        <>
          <SectionTitle>{t('newRecord')}</SectionTitle>
          {query.data.payload.records.map((r) => (
            <RecordRow
              key={`${r.exerciseId}:${r.loadMode}:${r.trackingMode}:${r.type}`}
              record={r}
              onPress={() =>
                router.push({
                  pathname: '/progress/[id]',
                  params: { id: r.exerciseId, range: 'all' },
                })
              }
            />
          ))}
          <CacheNotice
            stale={query.data.stale}
            fetchedAt={query.data.fetchedAt}
          />
        </>
      ) : null}
    </View>
  );
}
