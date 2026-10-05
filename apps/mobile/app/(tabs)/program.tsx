import { useRouter } from 'expo-router';
import ListChecks from 'lucide-react-native/icons/list-checks';
import { useTranslation } from 'react-i18next';
import { startMethods } from '@jimo/schemas';
import { Button, colors, Screen, Text } from '@jimo/ui';
import { EmptyState } from '../../src/components/EmptyState';
export default function ProgramScreen() {
  const { t } = useTranslation(['common', 'navigation']);
  const router = useRouter();
  return (
    <Screen bottomInset={false}>
      <Text variant="h1" accessibilityRole="header">
        {t('navigation:program')}
      </Text>
      <EmptyState
        icon={<ListChecks size={32} color={colors.primary} />}
        title={t('program.empty')}
        description={t('program.description')}
      >
        {startMethods.map((method) => (
          <Button
            key={method}
            variant="secondary"
            label={t(`methods.${method}`)}
            onPress={() => router.push('/program/create')}
          />
        ))}
      </EmptyState>
    </Screen>
  );
}
