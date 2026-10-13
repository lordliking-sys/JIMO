import { Redirect, useLocalSearchParams } from 'expo-router';
export default function LegacyDayAction() {
  const { id, dayId } = useLocalSearchParams<{ id: string; dayId?: string }>();
  return (
    <Redirect
      href={{
        pathname: '/program/[id]',
        params: { id, dayAction: 'edit', ...(dayId ? { dayId } : {}) },
      }}
    />
  );
}
