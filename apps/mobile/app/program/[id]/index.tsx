import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@jimo/ui';
import GripVertical from 'lucide-react-native/icons/grip-vertical';
import {
  useProgram,
  useProgramMutation,
  useApiLocale,
} from '../../../src/api/queries';
import { programsApi } from '../../../src/api/programs';
import {
  FormHeader,
  ActionMenu,
  QueryState,
  ErrorNotice,
  useConfirmation,
} from '../../../src/programs/components';
import {
  ProgramScreen,
  ProgramRow,
  ProgramText,
  ProgramButton,
  programInk,
} from '../../../src/programs/presentation';
import { moved, statusKey } from '../../../src/programs/helpers';
import { calendarDateLabel } from '../../../src/programs/date';
export default function Builder() {
  const { id } = useLocalSearchParams<{ id: string }>(),
    router = useRouter(),
    { t } = useTranslation('programs'),
    locale = useApiLocale(),
    query = useProgram(id),
    confirmation = useConfirmation();
  const mutation = useProgramMutation(
    (action: () => ReturnType<typeof programsApi.detail>) => action(),
  );
  const run = (action: () => ReturnType<typeof programsApi.detail>) => {
    if (!mutation.isPending) mutation.mutate(action);
  };
  if (!query.data)
    return (
      <QueryState
        presentation
        pending={query.isPending}
        error={query.error}
        retry={() => void query.refetch()}
      />
    );
  const program = query.data;
  const archive = () =>
    confirmation.ask(t('confirmArchiveAny'), () =>
      run(() => programsApi.archive(id, locale)),
    );
  return (
    <ProgramScreen
      background="structure"
      footer={
        <View style={{ gap: 8 }}>
          <ProgramButton
            label={t('save')}
            disabled={mutation.isPending}
            onPress={() =>
              router.canGoBack()
                ? router.back()
                : router.replace('/program/manage')
            }
          />
          {program.status !== 'active' ? (
            <ProgramButton
              variant="outline"
              label={t('activate')}
              busy={mutation.isPending}
              onPress={() => run(() => programsApi.activate(id, locale))}
            />
          ) : null}
        </View>
      }
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <FormHeader
            fontSize={22}
            title={t(program.days.length ? 'structureTitle' : 'addDaysTitle')}
          />
        </View>
        <ActionMenu
          label={t('programActions')}
          title={program.name}
          disabled={mutation.isPending}
          actions={[
            {
              label: t('editProgram'),
              action: () =>
                router.push({
                  pathname: '/program/[id]/settings',
                  params: { id },
                }),
            },
            ...(program.status !== 'archived'
              ? [
                  {
                    label: t('archive'),
                    action:
                      program.status === 'active'
                        ? () =>
                            confirmation.ask(t('confirmArchive'), () =>
                              run(() => programsApi.archive(id, locale)),
                            )
                        : archive,
                  },
                ]
              : []),
          ]}
        />
      </View>
      <ProgramText accessibilityRole="header" style={{ fontSize: 28 }}>
        {program.name}
      </ProgramText>
      <Text variant="caption" color={programInk.secondary}>
        {t(statusKey(program.status))}
      </Text>
      <Text variant="caption" color={programInk.secondary}>
        {program.durationWeeks
          ? t('weekCount', { count: program.durationWeeks })
          : t('unspecified')}
        {' · '}
        {program.startsOn
          ? calendarDateLabel(program.startsOn, locale)
          : t('unspecified')}
      </Text>
      {program.description ? (
        <Text variant="caption" color={programInk.secondary}>
          {program.description}
        </Text>
      ) : null}
      {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
      {!program.days.length ? (
        <Text color={programInk.secondary}>{t('noDaysHint')}</Text>
      ) : null}
      <View style={{ gap: 10 }}>
        {program.days.map((day, index) => (
          <ProgramRow
            key={day.id}
            title={day.name}
            eyebrow={t('dayNumber', { count: index + 1 })}
            subtitle={`${day.dayOfWeek ? t(`weekdays.${day.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7}`) : t('noWeekday')} · ${t('exerciseCount', { count: day.exercises.length })}`}
            label={`${t('openDay')} ${day.name}`}
            onPress={() =>
              router.push({
                pathname: '/program/[id]/day-detail',
                params: { id, dayId: day.id },
              })
            }
            leading={
              <ActionMenu
                icon={<GripVertical color={programInk.secondary} size={18} />}
                label={t('dayActions', { name: day.name })}
                title={day.name}
                disabled={mutation.isPending}
                actions={[
                  {
                    label: t('editDay'),
                    action: () =>
                      router.push({
                        pathname: '/program/[id]/day',
                        params: { id, dayId: day.id },
                      }),
                  },
                  {
                    label: `${t('moveUp')} ${day.name}`,
                    disabled: index === 0,
                    action: () =>
                      run(() =>
                        programsApi.reorderDays(
                          id,
                          moved(program.days, index, -1).map((d) => d.id),
                          locale,
                        ),
                      ),
                  },
                  {
                    label: `${t('moveDown')} ${day.name}`,
                    disabled: index === program.days.length - 1,
                    action: () =>
                      run(() =>
                        programsApi.reorderDays(
                          id,
                          moved(program.days, index, 1).map((d) => d.id),
                          locale,
                        ),
                      ),
                  },
                  {
                    label: t('deleteDay'),
                    action: () =>
                      day.exercises.length
                        ? confirmation.ask(t('confirmDeleteDay'), () =>
                            run(() => programsApi.removeDay(day.id, locale)),
                          )
                        : run(() => programsApi.removeDay(day.id, locale)),
                  },
                ]}
              />
            }
          />
        ))}
      </View>
      <ProgramButton
        variant="outline"
        label={t('addDay')}
        disabled={mutation.isPending}
        onPress={() =>
          router.push({ pathname: '/program/[id]/day', params: { id } })
        }
      />
      {confirmation.dialog}
    </ProgramScreen>
  );
}
