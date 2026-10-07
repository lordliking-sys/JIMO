import { Stack } from 'expo-router';
import { colors } from '@jimo/ui';
import { ImportDraftProvider } from '../../src/imports/Provider';
export default function ImportLayout() {
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
