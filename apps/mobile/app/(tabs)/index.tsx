import { useRouter } from 'expo-router';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import { useTranslation } from 'react-i18next';
import { Button, Card, colors, Screen, Text } from '@jimo/ui';
import { usePrograms } from '../../src/api/queries';
import { ErrorNotice } from '../../src/programs/components';
import { Wordmark } from '../../src/components/Wordmark';
import { EmptyState } from '../../src/components/EmptyState';
export default function HomeScreen() {
  const { t } = useTranslation(['common', 'programs']);
  const query = usePrograms();
  const active = query.data?.programs.find((p) => p.status === 'active');
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
      {query.isPending ? (
        <Text>{t('programs:loading')}</Text>
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : active ? (
        <Card>
          <Text variant="label" color={colors.primary}>
            {t('programs:activeProgram')}
          </Text>
          <Text variant="h2">{active.name}</Text>
          <Text>{t('programs:dayCount', { count: active.daysCount })}</Text>
          <Button
            label={t('programs:viewProgram')}
            onPress={() =>
              router.push({
                pathname: '/program/[id]',
                params: { id: active.id },
              })
            }
          />
        </Card>
      ) : (
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
      )}
    </Screen>
  );
}
