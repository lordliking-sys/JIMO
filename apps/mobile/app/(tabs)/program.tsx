import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Screen, Text, Button, Card, colors, Divider } from '@jimo/ui';
import { usePrograms } from '../../src/api/queries';
import { ErrorNotice } from '../../src/programs/components';
import { statusKey } from '../../src/programs/helpers';
import ListChecks from 'lucide-react-native/icons/list-checks';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { EmptyState } from '../../src/components/EmptyState';
export default function ProgramScreen() {
  const router = useRouter(),
    { t } = useTranslation('programs'),
    query = usePrograms();
  return (
    <Screen bottomInset={false}>
      <ScreenHeader title={t('title')} subtitle={t('subtitle')} settings />
      {query.isPending ? (
        <Text>{t('loading')}</Text>
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : !query.data?.programs.length ? (
        <EmptyState
          title={t('empty')}
          description={t('emptyDescription')}
          icon={<ListChecks size={32} color={colors.primary} />}
        >
          <Button
            label={t('create')}
            onPress={() => router.push('/program/manual')}
          />
          <Divider />
          <Text variant="caption" color={colors.secondary}>
            {t('aiSoon')}
          </Text>
          <Text variant="caption" color={colors.secondary}>
            {t('importSoon')}
          </Text>
        </EmptyState>
      ) : (
        <>
          {query.data.programs.map((p) => (
            <Card
              key={p.id}
              style={
                p.status === 'active'
                  ? { borderColor: colors.primary }
                  : undefined
              }
            >
              <Text
                variant="label"
                color={
                  p.status === 'active' ? colors.primary : colors.secondary
                }
              >
                {t(statusKey(p.status))}
              </Text>
              <Text variant="h2">{p.name}</Text>
              <Text>{t('dayCount', { count: p.daysCount })}</Text>
              {p.durationWeeks ? (
                <Text>{t('weekCount', { count: p.durationWeeks })}</Text>
              ) : null}
              <Button
                label={`${t('open')} ${p.name}`}
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: '/program/[id]',
                    params: { id: p.id },
                  })
                }
              />
            </Card>
          ))}
          <Button
            label={t('newProgram')}
            onPress={() => router.push('/program/create')}
          />
        </>
      )}
    </Screen>
  );
}
