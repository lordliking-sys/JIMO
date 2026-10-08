import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen, spacing, Button, Text, colors } from '@jimo/ui';
import { View } from 'react-native';
import {
  WorkoutVisualPreview,
  type PreviewMode,
} from '../../src/workouts/visual/WorkoutVisualPreview';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { WorkoutSchedule } from '../../src/workouts/Schedule';
export default function WorkoutTab() {
  const { t } = useTranslation('workouts');
  const [preview, setPreview] = useState<PreviewMode | null>(null);
  // WorkoutSchedule already refreshes on focus and offers Resume. An automatic
  // replacement here would reopen a live session immediately after SafeBack.
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
