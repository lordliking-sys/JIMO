import { useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, spacing } from '@jimo/ui';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { WorkoutSchedule } from '../../src/workouts/Schedule';
import { useActiveWorkout } from '../../src/workouts/queries';
export default function WorkoutTab() {
  const { t } = useTranslation('workouts'),
    active = useActiveWorkout(),
    router = useRouter();
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
    </Screen>
  );
}
