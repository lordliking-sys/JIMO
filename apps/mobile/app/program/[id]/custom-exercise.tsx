import { Redirect, useLocalSearchParams } from 'expo-router';
export default function LegacyAction() {
  const { id, dayId, exerciseId, prescriptionId } = useLocalSearchParams<{
    id: string;
    dayId: string;
    exerciseId?: string;
    prescriptionId?: string;
  }>();
  return (
    <Redirect
      href={{
        pathname: '/program/[id]/day-detail',
        params: {
          id,
          dayId,
          overlay: 'custom',
          ...(exerciseId ? { exerciseId } : {}),
          ...(prescriptionId ? { prescriptionId } : {}),
        },
      }}
    />
  );
}
