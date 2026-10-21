import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text } from '@jimo/ui';
import GripVertical from 'lucide-react-native/icons/grip-vertical';
import type { DayDto, ProgramInput } from '@jimo/schemas';
import { useProgram, useProgramMutation, useApiLocale } from '../api/queries';
import { programsApi } from '../api/programs';
import {
  ActionMenu,
  QueryState,
  ErrorNotice,
  useConfirmation,
} from '../programs/components';
import {
  ProgramRow,
  ProgramText,
  ProgramButton,
  programInk,
} from '../programs/presentation';
import { ProgramForm } from '../programs/ProgramForm';
import { ProgramOverlay } from '../programs/ProgramOverlay';
import { DayEditor } from '../programs/DayEditor';
import { DeleteProgram } from '../programs/DeleteProgram';
import { moved } from '../programs/helpers';
import { useOffline } from '../db/Provider';
export function ProgramManagement({
  id,
  dayAction,
  dayId,
  onSaved,
  onDeleted,
  onOpenDay,
}: {
  id: string;
  dayAction?: string;
  dayId?: string;
  onSaved?: () => void;
  onDeleted?: () => void;
  onOpenDay?: (dayId: string) => void;
}) {
  const router = useRouter(),
    { runtime } = useOffline(),
    { t } = useTranslation('programs'),
    locale = useApiLocale(),
    query = useProgram(id),
    confirmation = useConfirmation();
  const [day, setDay] = useState<DayDto | 'new' | null>(null);
  const mutation = useProgramMutation(
    (action: () => ReturnType<typeof programsApi.detail>) => action(),
  );
  const save = useProgramMutation((input: ProgramInput) =>
    programsApi.update(id, input, locale),
  );
  const run = (action: () => ReturnType<typeof programsApi.detail>) => {
    if (!mutation.isPending) mutation.mutate(action);
  };
  const [handledDay, setHandledDay] = useState<string | null>(null);
  const dayKey = `${id}:${dayAction}:${dayId}`;
  const legacyDay =
    query.data && dayAction && handledDay !== dayKey
      ? dayId
        ? (query.data.days.find((d) => d.id === dayId) ?? null)
        : 'new'
      : null;
  const currentDay = day ?? legacyDay;
  const closeDay = () => {
    setDay(null);
    setHandledDay(dayKey);
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
  return (
    <ProgramForm
      initial={program}
      fallback="/program"
      pending={save.isPending}
      error={save.error}
      save={(input) =>
        save.mutate(input, {
          onSuccess: () => (onSaved ? onSaved() : router.dismissTo('/program')),
        })
      }
      actions={
        <View style={{ gap: 8 }}>
          {program.status !== 'active' ? (
            <ProgramButton
              variant="outline"
              label={t('activate')}
              busy={mutation.isPending}
              onPress={() =>
                run(async () => {
                  await runtime.prepareProgramActivation(id);
                  return programsApi.activate(id, locale);
                })
              }
            />
          ) : null}
          {program.status !== 'archived' ? (
            <ProgramButton
              variant="text"
              label={t('archive')}
              busy={mutation.isPending}
              onPress={() =>
                confirmation.ask(
                  t(
                    program.status === 'active'
                      ? 'confirmArchive'
                      : 'confirmArchiveAny',
                  ),
                  () =>
                    run(async () => {
                      await runtime.prepareProgramChange(id);
                      return programsApi.archive(id, locale);
                    }),
                )
              }
            />
          ) : null}
          <DeleteProgram id={id} {...(onDeleted ? { onDeleted } : {})} />
          {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
          {confirmation.dialog}
        </View>
      }
    >
      <ProgramText accessibilityRole="header">{t('daysHeading')}</ProgramText>
      {!program.days.length ? (
        <Text color={programInk.secondary}>{t('noDaysHint')}</Text>
      ) : null}
      <View style={{ gap: 10 }}>
        {program.days.map((item, index) => (
          <ProgramRow
            key={item.id}
            title={
              item.dayOfWeek
                ? t(`weekdays.${item.dayOfWeek as 1 | 2 | 3 | 4 | 5 | 6 | 7}`)
                : item.name
            }
            subtitle={`${item.dayOfWeek ? `${item.name} · ` : ''}${t('exerciseCount', { count: item.exercises.length })}`}
            label={`${t('openDay')} ${item.name}`}
            onPress={() =>
              onOpenDay
                ? onOpenDay(item.id)
                : router.push({
                    pathname: '/program/[id]/day-detail',
                    params: { id, dayId: item.id },
                  })
            }
            trailing={
              <ActionMenu
                icon={<GripVertical color={programInk.secondary} size={18} />}
                label={t('dayActions', { name: item.name })}
                title={item.name}
                disabled={mutation.isPending}
                actions={[
                  { label: t('editDay'), action: () => setDay(item) },
                  {
                    label: `${t('moveUp')} ${item.name}`,
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
                    label: `${t('moveDown')} ${item.name}`,
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
                      confirmation.ask(t('confirmDeleteDay'), () =>
                        run(async () => {
                          await runtime.prepareProgramChange(id);
                          return programsApi.removeDay(item.id, locale);
                        }),
                      ),
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
        onPress={() => setDay('new')}
      />
      {currentDay ? (
        <ProgramOverlay back={closeDay}>
          <DayEditor
            id={id}
            {...(currentDay === 'new' ? {} : { day: currentDay })}
            onSaved={closeDay}
          />
        </ProgramOverlay>
      ) : null}
    </ProgramForm>
  );
}
