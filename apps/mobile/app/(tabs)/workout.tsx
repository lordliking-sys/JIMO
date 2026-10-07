import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, spacing, Button, Text, colors } from '@jimo/ui';
import { View } from 'react-native';
import {
  WorkoutVisualPreview,
  type PreviewMode,
} from '../../src/workouts/visual/WorkoutVisualPreview';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { WorkoutSchedule } from '../../src/workouts/Schedule';
import { useActiveWorkout } from '../../src/workouts/queries';
export default function WorkoutTab() {
  const { t } = useTranslation('workouts'),
    active = useActiveWorkout(),
    router = useRouter();
  const [preview, setPreview] = useState<PreviewMode | null>(null);
  const { refetch } = active;
  useFocusEffect(
    useCallback(() => {
      let live = true;
      void refetch().then((result) => {
        const w = result.data?.workout;
        if (w && live)
          router.replace({ pathname: '/workout/[id]', params: { id: w.id } });
      });
      return () => {
        live = false;
      };
    }, [refetch, router]),
  );
  return (
    <Screen
      bottomInset={false}
      contentStyle={{ padding: spacing.lg, gap: spacing.lg }}
    >
      <ScreenHeader title={t('title')} light />
      <WorkoutSchedule />
      <View style={{ gap: spacing.xs }}>
        <Text variant="caption" color={colors.secondary}>
          {t('visual.previews')}
        </Text>
        <Button
          variant="text"
          label={t('visual.emomPreview')}
          onPress={() => setPreview('emom')}
        />
        <Button
          variant="text"
          label={t('visual.pyramidPreview')}
          onPress={() => setPreview('pyramid')}
        />
      </View>
      <WorkoutVisualPreview mode={preview} onClose={() => setPreview(null)} />
    </Screen>
  );
}
