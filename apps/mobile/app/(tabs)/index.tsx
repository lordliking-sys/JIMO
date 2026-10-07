import { useTranslation } from 'react-i18next';
import { Screen } from '@jimo/ui';
import { useGreeting } from '../../src/home/useGreeting';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { WorkoutSchedule } from '../../src/workouts/Schedule';
export default function HomeScreen() {
  const { t } = useTranslation('common'),
    greeting = useGreeting();
  return (
    <Screen bottomInset={false}>
      <ScreenHeader
        title={t(`home.greetings.${greeting}`)}
        subtitle={t('home.subtitle')}
      />
      <WorkoutSchedule home />
    </Screen>
  );
}
