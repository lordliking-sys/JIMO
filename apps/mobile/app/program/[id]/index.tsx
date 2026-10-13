import { useLocalSearchParams } from 'expo-router';
import { ProgramManagement } from '../../../src/programs/ProgramManagement';
/** Compatibility entry for existing deep links; daily management is an overlay. */
export default function ProgramEditor() {
  const { id, dayAction, dayId } = useLocalSearchParams<{
    id: string;
    dayAction?: string;
    dayId?: string;
  }>();
  return (
    <ProgramManagement
      id={id}
      {...(dayAction ? { dayAction } : {})}
      {...(dayId ? { dayId } : {})}
    />
  );
}
