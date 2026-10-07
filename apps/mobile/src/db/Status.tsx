import { useIsFocused } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, Button, colors, spacing } from '@jimo/ui';
import { useOffline } from './Provider';
export function SyncStatus() {
  const focused = useIsFocused();
  const { runtime } = useOffline(),
    { t } = useTranslation('workouts');
  const state = useQuery({
    queryKey: ['local', 'sync-status', runtime.owner],
    queryFn: async () => ({
      operations: runtime.owner ? await runtime.outbox.list(runtime.owner) : [],
      conflict: runtime.owner
        ? await runtime.metadata(runtime.owner, 'activeConflict')
        : null,
    }),
    networkMode: 'always',
  });
  const conflict =
      state.data?.conflict ||
      state.data?.operations.some((o) => o.status === 'conflict'),
    failed =
      state.data?.operations.some((o) => o.status === 'failed') ||
      runtime.syncError;
  const message = conflict
    ? t('offline.conflict')
    : !runtime.online
      ? t('offline.saved')
      : failed
        ? t('offline.error')
        : state.data?.operations.length
          ? t('offline.syncing')
          : null;
  if (!focused || !message) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      <Text
        variant="caption"
        accessibilityLiveRegion="polite"
        color={conflict || failed ? colors.danger : colors.secondary}
      >
        {!runtime.online ? `${t('offline.offline')} · ` : ''}
        {message}
      </Text>
      {runtime.online && failed && !conflict ? (
        <Button
          variant="secondary"
          label={t('offline.retry')}
          onPress={() => void runtime.engine.request(true)}
        />
      ) : null}
    </View>
  );
}
