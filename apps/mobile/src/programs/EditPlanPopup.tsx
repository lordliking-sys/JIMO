import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, animePink } from '@jimo/ui';
import {
  programInputSchema,
  type ProgramInput,
  type ProgramSummary,
} from '@jimo/schemas';
import { useApiLocale, useProgramMutation } from '../api/queries';
import { programsApi } from '../api/programs';
import { QuickPlanFields } from './QuickPlanPopups';
import { ProgramPopup, PopupButton } from './ProgramPopup';
import { integerInput } from './helpers';
import { ErrorNotice } from './components';
import { DeleteProgram } from './DeleteProgram';

/** Essential metadata only; days and prescriptions are edited from their own day. */
export function EditPlanPopup({
  program,
  close,
  visible,
  onDismiss,
}: {
  program: ProgramSummary;
  close(): void;
  visible: boolean;
  onDismiss(): void;
}) {
  const { t } = useTranslation(['main', 'programs']),
    locale = useApiLocale();
  const [name, setName] = useState(program.name),
    [description, setDescription] = useState(program.description ?? ''),
    [weeks, setWeeks] = useState(program.durationWeeks?.toString() ?? ''),
    [invalid, setInvalid] = useState(false),
    [more, setMore] = useState(false),
    [archive, setArchive] = useState(false),
    [deleting, setDeleting] = useState(false);
  const save = useProgramMutation((input: ProgramInput) =>
    programsApi.update(program.id, input, locale),
  );
  const archiveMutation = useProgramMutation(() =>
    programsApi.archive(program.id, locale),
  );
  const busy = save.isPending || archiveMutation.isPending || deleting;
  const dirty =
    name !== program.name ||
    description !== (program.description ?? '') ||
    weeks !== (program.durationWeeks?.toString() ?? '');
  const submit = () => {
    if (busy) return;
    try {
      const input = programInputSchema.parse({
        name,
        description: description.trim() || null,
        durationWeeks: weeks.trim() ? integerInput(weeks) : null,
        // Hidden metadata is preserved; editing a name never clears the calendar anchor.
        startsOn: program.startsOn,
      });
      setInvalid(false);
      save.mutate(input, { onSuccess: close });
    } catch {
      setInvalid(true);
    }
  };
  return (
    <ProgramPopup
      title={t('managePlan')}
      visible={visible}
      onDismiss={onDismiss}
      close={close}
      dirty={dirty}
      busy={busy}
      scrollKey={`edit:${program.id}`}
      footer={(dismiss) => (
        <>
          <PopupButton
            label={t('programs:save')}
            onPress={submit}
            busy={save.isPending}
            disabled={busy}
          />
          <PopupButton
            label={t('programs:cancel')}
            onPress={dismiss}
            outline
            disabled={busy}
          />
        </>
      )}
    >
      <QuickPlanFields
        name={name}
        description={description}
        weeks={weeks}
        setName={setName}
        setDescription={setDescription}
        setWeeks={setWeeks}
        busy={busy}
        invalid={invalid}
      />
      {save.error ? <ErrorNotice error={save.error} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('popup.moreActions')}
        accessibilityState={{ expanded: more, disabled: busy }}
        disabled={busy}
        onPress={() => setMore(!more)}
        style={{ minHeight: 48, justifyContent: 'center' }}
      >
        <Text variant="caption" color={animePink.primaryText}>
          {t('popup.moreActions')}
        </Text>
      </Pressable>
      {more ? (
        <View style={{ gap: 8 }}>
          {program.status !== 'archived' ? (
            <>
              {archive ? (
                <>
                  <Text accessibilityRole="alert" color={animePink.ink}>
                    {t('programs:confirmArchive')}
                  </Text>
                  <PopupButton
                    label={t('programs:confirm')}
                    busy={archiveMutation.isPending}
                    disabled={busy}
                    onPress={() =>
                      archiveMutation.mutate(undefined, { onSuccess: close })
                    }
                  />
                  <PopupButton
                    label={t('programs:cancel')}
                    outline
                    disabled={busy}
                    onPress={() => setArchive(false)}
                  />
                </>
              ) : (
                <PopupButton
                  label={t('programs:archive')}
                  outline
                  disabled={busy}
                  onPress={() => setArchive(true)}
                />
              )}
            </>
          ) : null}
          {archiveMutation.error ? (
            <ErrorNotice error={archiveMutation.error} />
          ) : null}
          <DeleteProgram
            id={program.id}
            inline
            disabled={busy && !deleting}
            onBusyChange={setDeleting}
            onDeleted={close}
          />
        </View>
      ) : null}
    </ProgramPopup>
  );
}
