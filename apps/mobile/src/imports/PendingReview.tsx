import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { Button, Text, spacing, colors } from '@jimo/ui';
import { useOffline } from '../db/Provider';
import { ImportDraftRepository } from './draft';
export function PendingReview() {
  const { runtime } = useOffline(),
    owner = runtime.owner,
    router = useRouter(),
    { t } = useTranslation('imports');
  const repo = useMemo(
    () =>
      new ImportDraftRepository(
        runtime.db,
        process.env.EXPO_PUBLIC_API_URL ?? '',
      ),
    [runtime],
  );
  const [pending, setPending] = useState<string | null>(null);
  useFocusEffect(
    useCallback(() => {
      let live = true;
      setPending(null);
      if (owner)
        void repo
          .read(owner)
          .then((d) => {
            if (live && d) setPending(owner);
          })
          .catch(() => {});
      return () => {
        live = false;
      };
    }, [repo, owner]),
  );
  return pending && pending === owner ? (
    <View
      style={{
        gap: spacing.sm,
        borderBottomWidth: 1,
        borderColor: colors.border,
        paddingBottom: spacing.md,
      }}
    >
      <Text variant="label" color={colors.secondary}>
        {t('unfinished')}
      </Text>
      <Button
        label={t('resume')}
        variant="text"
        onPress={() => router.push('/import/review')}
      />
    </View>
  ) : null;
}
