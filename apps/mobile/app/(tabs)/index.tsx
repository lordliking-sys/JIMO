import { useRouter } from 'expo-router';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import { useTranslation } from 'react-i18next';
import { Button, colors, Screen, Text } from '@jimo/ui';
import { Wordmark } from '../../src/components/Wordmark';
import { EmptyState } from '../../src/components/EmptyState';
export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  return (
    <Screen bottomInset={false}>
      <Wordmark compact />
      <Text variant="h1" accessibilityRole="header">
        {t('home.greeting')}
      </Text>
      <Text variant="label" color={colors.secondary}>
        {t('home.today')}
      </Text>
      <EmptyState
        icon={<Dumbbell color={colors.primary} size={32} />}
        title={t('home.empty')}
        description={t('home.description')}
      >
        <Button
          label={t('home.create')}
          onPress={() => router.push('/program/create')}
        />
      </EmptyState>
    </Screen>
  );
}
