import { View } from 'react-native';
import { Text } from '@jimo/ui';
import type { ProgramSummary } from '@jimo/schemas';
import { useTranslation } from 'react-i18next';
import { useOffline } from '../db/Provider';
import { useProgram, useApiLocale, useProgramMutation } from '../api/queries';
import { programsApi } from '../api/programs';
import {
  FormHeader,
  FormScreen,
  ErrorNotice,
  useConfirmation,
} from './components';
import {
  ProgramRow,
  ProgramButton,
  ProgramText,
  programInk,
} from './presentation';
export function PlanSwitcher({
  programs,
  onActivated,
  onManage,
  selectedId,
  select,
}: {
  programs: ProgramSummary[];
  onActivated(): void;
  onManage(id: string): void;
  selectedId?: string;
  select(id: string): void;
}) {
  const { t } = useTranslation(['main', 'programs']);
  const selected = selectedId,
    locale = useApiLocale(),
    query = useProgram(selected ?? ''),
    confirmation = useConfirmation(),
    { runtime } = useOffline();
  const activate = useProgramMutation((id: string) =>
    programsApi.activate(id, locale),
  );
  const summary = programs.find((p) => p.id === selected),
    program = query.data ?? summary;
  return (
    <FormScreen
      presentation
      header={<FormHeader title={t('switchPlanTitle')} />}
    >
      {!selected ? (
        <View style={{ gap: 8 }}>
          {programs.map((p) => (
            <ProgramRow
              key={p.id}
              title={p.name}
              subtitle={t(
                p.status === 'active' ? 'activePlan' : 'inactivePlan',
              )}
              label={`${p.name}, ${t(p.status === 'active' ? 'activePlan' : 'inactivePlan')}`}
              onPress={() => select(p.id)}
            />
          ))}
          {!programs.length ? (
            <Text color={programInk.secondary}>{t('programs:empty')}</Text>
          ) : null}
        </View>
      ) : (
        <View testID="switch-plan-detail" style={{ gap: 16 }}>
          {program ? (
            <>
              <ProgramText accessibilityRole="header">
                {program.name}
              </ProgramText>
              <Text color={programInk.primary}>
                {t(program.status === 'active' ? 'activePlan' : 'inactivePlan')}
              </Text>
              {program.description ? (
                <Text color={programInk.secondary}>{program.description}</Text>
              ) : null}
              <Text color={programInk.secondary}>
                {t('programs:dayCount', { count: program.daysCount })}
                {program.durationWeeks
                  ? ` · ${t('programs:weekCount', { count: program.durationWeeks })}`
                  : ''}
              </Text>
              {program.status !== 'active' ? (
                <ProgramButton
                  label={t('setActive')}
                  disabled={query.isPending || !!query.error || !runtime.online}
                  busy={activate.isPending}
                  onPress={() =>
                    confirmation.ask(
                      t('confirmSetActive', { name: program.name }),
                      () =>
                        activate.mutate(program.id, { onSuccess: onActivated }),
                    )
                  }
                />
              ) : null}
              <ProgramButton
                variant="outline"
                label={t('manageSelected')}
                disabled={activate.isPending}
                onPress={() => onManage(program.id)}
              />
            </>
          ) : null}
          {query.error ? (
            <ErrorNotice
              error={query.error}
              retry={() => void query.refetch()}
            />
          ) : null}
          {activate.error ? <ErrorNotice error={activate.error} /> : null}
        </View>
      )}
      {confirmation.dialog}
    </FormScreen>
  );
}
