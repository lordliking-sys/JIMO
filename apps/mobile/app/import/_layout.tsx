import { Redirect, Stack } from 'expo-router';
import { colors } from '@jimo/ui';
import { ImportDraftProvider } from '../../src/imports/Provider';
import { useImportAvailability } from '../../src/features/useImportFeature';
import { StartupScreen } from '../../src/components/StartupScreen';
export default function ImportLayout() {
  const availability = useImportAvailability();
  // Only this optional route waits; the core app never waits for AI metadata.
  if (availability.pending)
    return <StartupScreen error={false} retry={() => {}} />;
  if (!availability.enabled) return <Redirect href="/program" />;
  return (
    <ImportDraftProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </ImportDraftProvider>
  );
}
