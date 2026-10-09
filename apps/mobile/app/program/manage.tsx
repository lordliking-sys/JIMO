import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@jimo/ui';
import {
  usePrograms,
  useProgramMutation,
  useApiLocale,
} from '../../src/api/queries';
import { programsApi } from '../../src/api/programs';
import {
  ProgramScreen,
  ProgramText,
  ProgramRow,
  ProgramButton,
  programInk,
} from '../../src/programs/presentation';
import {
  FormHeader,
  ActionMenu,
  ErrorNotice,
  useConfirmation,
} from '../../src/programs/components';
import { statusKey } from '../../src/programs/helpers';
export default function ProgramManager() {
  const query = usePrograms(),
    router = useRouter(),
    { t } = useTranslation('programs'),
    locale = useApiLocale(),
    confirmation = useConfirmation();
  const mutation = useProgramMutation(
    (action: () => ReturnType<typeof programsApi.detail>) => action(),
  );
  return (
    <ProgramScreen
      fallback="/program"
      footer={
        <ProgramButton
          label={t('create')}
          onPress={() => router.push('/program/manual')}
        />
      }
    >
      <FormHeader title={t('managerTitle')} />
      <ProgramText
        style={{
          fontSize: 20,
          paddingBottom: 10,
          borderBottomWidth: 1,
          borderColor: programInk.green,
        }}
      >
        {t('myPrograms')}
      </ProgramText>
      {query.isPending ? (
        <Text color={programInk.secondary} accessibilityRole="progressbar">
          {t('loading')}
        </Text>
      ) : query.error ? (
        <ErrorNotice error={query.error} retry={() => void query.refetch()} />
      ) : !query.data?.programs.length ? (
        <Text color={programInk.secondary}>{t('empty')}</Text>
      ) : null}
      <View style={{ gap: 10 }}>
        {query.data?.programs.map((p) => {
          const open = () =>
            router.push({ pathname: '/program/[id]', params: { id: p.id } });
          const archive = () =>
            confirmation.ask(
              t(p.status === 'active' ? 'confirmArchive' : 'confirmArchiveAny'),
              () => mutation.mutate(() => programsApi.archive(p.id, locale)),
            );
          return (
            <ProgramRow
              key={p.id}
              title={p.name}
              label={`${t('open')} ${p.name}`}
              subtitle={`${t(statusKey(p.status))} · ${t('dayCount', { count: p.daysCount })} · ${p.durationWeeks ? t('weekCount', { count: p.durationWeeks }) : t('unspecified')}`}
              onPress={open}
              trailing={
                <ActionMenu
                  label={`${t('programActions')} ${p.name}`}
                  title={p.name}
                  disabled={mutation.isPending}
                  actions={[
                    {
                      label: t('editProgram'),
                      action: () =>
                        router.push({
                          pathname: '/program/[id]/settings',
                          params: { id: p.id },
                        }),
                    },
                    { label: t('manageDays'), action: open },
                    ...(p.status !== 'archived'
                      ? [{ label: t('archive'), action: archive }]
                      : []),
                  ]}
                />
              }
            />
          );
        })}
      </View>
      {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
      {confirmation.dialog}
    </ProgramScreen>
  );
}
