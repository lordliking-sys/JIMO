import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
export function workoutHaptic(kind: 'set' | 'rest', reducedMotion: boolean) {
  if (Platform.OS === 'web' || reducedMotion) return;
  void Haptics.notificationAsync(
    kind === 'set'
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Warning,
  ).catch(() => {});
}
