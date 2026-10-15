import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Text, animePink } from '@jimo/ui';
import {
  programInputSchema,
  type ProgramInput,
  type ProgramSummary,
} from '@jimo/schemas';
import Plus from 'lucide-react-native/icons/plus';
import Minus from 'lucide-react-native/icons/minus';
import Check from 'lucide-react-native/icons/check';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { useApiLocale, useProgramMutation } from '../api/queries';
import { programsApi } from '../api/programs';
import { useOffline } from '../db/Provider';
import { DateField } from './DateField';
import { ErrorNotice } from './components';
import { integerInput, stepInteger } from './helpers';
import { PopupButton, ProgramPopup, usePopupFocus } from './ProgramPopup';

type ModalControls = { close(): void; visible: boolean; onDismiss(): void };
export function QuickPlanFields({
  name,
  description,
  weeks,
  starts,
  setName,
  setDescription,
  setWeeks,
  setStarts,
  busy,
  invalid,
}: {
  name: string;
  description: string;
  weeks: string;
  starts?: string;
  setName(value: string): void;
  setDescription(value: string): void;
  setWeeks(value: string): void;
  setStarts?: (value: string) => void;
  busy: boolean;
  invalid: boolean;
}) {
  const { t } = useTranslation(['main', 'programs']),
    focus = usePopupFocus();
  const nameRef = useRef<TextInput>(null),
    descriptionRef = useRef<TextInput>(null),
    weeksRef = useRef<TextInput>(null);
  const field = {
    minHeight: 48,
    borderWidth: 1,
    borderColor: animePink.border,
    backgroundColor: animePink.surfaceSoft,
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: animePink.ink,
  } as const;
  const label = { fontSize: 14, lineHeight: 20, color: animePink.ink } as const;
  const step = (direction: 1 | -1) => {
    try {
      setWeeks(stepInteger(weeks, direction, { min: 1, max: 520, initial: 8 }));
    } catch {
      weeksRef.current?.focus();
    }
  };
  return (
    <>
      <View style={{ gap: 6 }}>
        <Text style={label}>{t('popup.name')}</Text>
        <TextInput
          ref={nameRef}
          accessibilityLabel={t('popup.name')}
          value={name}
          editable={!busy}
          onChangeText={setName}
          onFocus={() => focus(nameRef.current)}
          maxLength={160}
          autoCapitalize="sentences"
          returnKeyType="next"
          onSubmitEditing={() => descriptionRef.current?.focus()}
          placeholder={t('popup.namePlaceholder')}
          placeholderTextColor={animePink.textSecondary}
          selectionColor={animePink.primaryPink}
          style={field}
        />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={label}>{t('programs:description')}</Text>
        <TextInput
          ref={descriptionRef}
          accessibilityLabel={t('programs:description')}
          value={description}
          editable={!busy}
          onChangeText={setDescription}
          onFocus={() => focus(descriptionRef.current)}
          maxLength={2000}
          multiline
          placeholder={t('programs:descriptionPlaceholder')}
          placeholderTextColor={animePink.textSecondary}
          selectionColor={animePink.primaryPink}
          style={[
            field,
            { minHeight: 72, maxHeight: 96, textAlignVertical: 'top' },
          ]}
        />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={label}>{t('popup.weeks')}</Text>
        <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
          {([-1, 1] as const).map((direction) => {
            const Icon = direction < 0 ? Minus : Plus;
            const button = (
              <Pressable
                key={direction}
                accessibilityRole="button"
                accessibilityLabel={t(
                  direction < 0 ? 'popup.decreaseWeeks' : 'popup.increaseWeeks',
                )}
                disabled={
                  busy ||
                  (direction < 0 ? Number(weeks) === 1 : Number(weeks) === 520)
                }
                onPress={() => step(direction)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 18,
                  backgroundColor: animePink.primaryPinkPale,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon
                  size={23}
                  color={animePink.primaryText}
                  accessible={false}
                />
              </Pressable>
            );
            return direction < 0 ? (
              <View
                key={direction}
                style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
              >
                {button}
                <TextInput
                  ref={weeksRef}
                  accessibilityLabel={t('popup.weeks')}
                  value={weeks}
                  editable={!busy}
                  onChangeText={setWeeks}
                  onFocus={() => focus(weeksRef.current)}
                  keyboardType="number-pad"
                  inputMode="numeric"
                  selectTextOnFocus
                  maxLength={3}
                  style={[
                    field,
                    { width: 70, textAlign: 'center', paddingHorizontal: 4 },
                  ]}
                />
              </View>
            ) : (
              button
            );
          })}
        </View>
      </View>
      {setStarts ? (
        <DateField
          compact
          disabled={busy}
          value={starts ?? ''}
          onChange={setStarts}
        />
      ) : null}
      {invalid ? (
        <Text
          accessibilityRole="alert"
          color={animePink.danger}
          style={{ fontSize: 13 }}
        >
          {t('programs:invalidForm')}
        </Text>
      ) : null}
    </>
  );
}

export function QuickPlanPopup({
  mode,
  programs,
  close,
  onNew,
  onManage,
  ...controls
}: ModalControls & {
  mode: 'create' | 'switch';
  programs: ProgramSummary[];
  onNew(): void;
  onManage(id: string): void;
}) {
  const { t } = useTranslation(['main', 'programs']),
    locale = useApiLocale();
  const [name, setName] = useState(''),
    [description, setDescription] = useState(''),
    [weeks, setWeeks] = useState('8'),
    [starts, setStarts] = useState(''),
    [invalid, setInvalid] = useState(false);
  const mutation = useProgramMutation((input: ProgramInput) =>
    programsApi.create(input, locale),
  );
  const dirty =
    name !== '' || description !== '' || weeks !== '8' || starts !== '';
  const submit = () => {
    try {
      const input = programInputSchema.parse({
        name,
        description: description.trim() || null,
        durationWeeks: weeks.trim() ? integerInput(weeks) : null,
        startsOn: starts || null,
      });
      setInvalid(false);
      mutation.mutate(input, { onSuccess: close });
    } catch {
      setInvalid(true);
    }
  };
  const { runtime } = useOffline();
  const [selected, setSelected] = useState<ProgramSummary | null>(null);
  const activate = useProgramMutation((id: string) =>
    programsApi.activate(id, locale),
  );
  return (
    <ProgramPopup
      {...controls}
      close={close}
      scrollKey={`${mode}:${selected?.id ?? ''}`}
      title={t(mode === 'create' ? 'popup.newTitle' : 'popup.switchTitle')}
      dirty={mode === 'create' && dirty}
      busy={mutation.isPending || activate.isPending}
      footer={
        mode === 'create' ? (
          (dismiss) => (
            <>
              <PopupButton
                label={t('popup.create')}
                busy={mutation.isPending}
                onPress={submit}
              />
              <PopupButton
                label={t('programs:cancel')}
                outline
                disabled={mutation.isPending}
                onPress={dismiss}
              />
            </>
          )
        ) : (
          <PopupButton
            label={t('newPlan')}
            outline
            disabled={activate.isPending}
            onPress={() => {
              setSelected(null);
              onNew();
            }}
          />
        )
      }
    >
      {mode === 'create' ? (
        <>
          <QuickPlanFields
            name={name}
            description={description}
            weeks={weeks}
            starts={starts}
            setName={(value) => {
              setName(value);
              setInvalid(false);
            }}
            setDescription={(value) => {
              setDescription(value);
              setInvalid(false);
            }}
            setWeeks={(value) => {
              setWeeks(value);
              setInvalid(false);
            }}
            setStarts={setStarts}
            busy={mutation.isPending}
            invalid={invalid}
          />
          {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
        </>
      ) : (
        <>
          {selected ? (
            <View
              testID="switch-plan-confirmation"
              style={{
                padding: 12,
                gap: 8,
                backgroundColor: animePink.primaryPinkPale,
                borderRadius: 20,
              }}
            >
              <Text
                accessibilityRole="alert"
                style={{ color: animePink.ink, fontSize: 14 }}
              >
                {t('confirmSetActive', { name: selected.name })}
              </Text>
              <View style={{ gap: 8 }}>
                <PopupButton
                  label={t('popup.activate')}
                  busy={activate.isPending}
                  disabled={!runtime.online}
                  onPress={() =>
                    activate.mutate(selected.id, { onSuccess: close })
                  }
                />
                <PopupButton
                  label={t('programs:cancel')}
                  outline
                  disabled={activate.isPending}
                  onPress={() => setSelected(null)}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                disabled={activate.isPending}
                accessibilityLabel={t('manageSelected')}
                onPress={() => onManage(selected.id)}
                style={{
                  minHeight: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text color={animePink.primaryText} style={{ fontSize: 13 }}>
                  {t('manageSelected')}
                </Text>
              </Pressable>
            </View>
          ) : null}
          <View style={{ gap: 4 }}>
            {programs.map((program) => {
              const active = program.status === 'active';
              return (
                <Pressable
                  key={program.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${program.name}, ${t(active ? 'activePlan' : 'inactivePlan')}`}
                  accessibilityHint={t('popup.manageHint')}
                  accessibilityActions={[
                    { name: 'edit', label: t('manageSelected') },
                  ]}
                  onAccessibilityAction={(event) => {
                    if (event.nativeEvent.actionName === 'edit')
                      onManage(program.id);
                  }}
                  onLongPress={() => onManage(program.id)}
                  disabled={activate.isPending}
                  onPress={() => {
                    if (!active) setSelected(program);
                  }}
                  style={({ pressed }) => ({
                    minHeight: 68,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 20,
                    backgroundColor: active
                      ? animePink.primaryPinkPale
                      : pressed
                        ? animePink.surfaceSoft
                        : 'transparent',
                    flexDirection: 'row',
                    gap: 8,
                    alignItems: 'center',
                  })}
                >
                  <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                    <Text
                      style={{
                        fontFamily: 'Inter_600SemiBold',
                        fontSize: 16,
                        color: animePink.ink,
                      }}
                    >
                      {program.name}
                    </Text>
                    <Text variant="caption" color={animePink.textSecondary}>
                      {program.durationWeeks
                        ? t('programs:weekCount', {
                            count: program.durationWeeks,
                          })
                        : t('popup.noDuration')}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      borderRadius: 18,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 4,
                      backgroundColor: active
                        ? animePink.primaryAction
                        : '#E8E3E9',
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Inter_500Medium',
                        fontSize: 11,
                        lineHeight: 16,
                        color: active ? animePink.white : animePink.ink,
                      }}
                    >
                      {t(active ? 'activePlan' : 'inactivePlan')}
                    </Text>
                    {active ? (
                      <Check
                        size={14}
                        color={animePink.white}
                        accessible={false}
                      />
                    ) : null}
                  </View>
                  {!active ? (
                    <ChevronRight
                      size={17}
                      color={animePink.ink}
                      accessible={false}
                    />
                  ) : null}
                </Pressable>
              );
            })}
            {!programs.length ? (
              <Text color={animePink.textSecondary}>{t('programs:empty')}</Text>
            ) : null}
          </View>
          {activate.error ? <ErrorNotice error={activate.error} /> : null}
        </>
      )}
    </ProgramPopup>
  );
}
