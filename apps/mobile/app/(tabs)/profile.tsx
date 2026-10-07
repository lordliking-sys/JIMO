import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Modal } from 'react-native';
import Languages from 'lucide-react-native/icons/languages';
import { Button, Card, colors, Screen, Text, spacing, sizes } from '@jimo/ui';
import { LanguagePicker } from '../../src/components/LanguagePicker';
import { usePreferences } from '../../src/storage/PreferencesProvider';
import { ScreenHeader } from '../../src/components/ScreenHeader';
import { useAccount } from '../../src/auth/AccountProvider';
import { useAuthSession } from '../../src/auth/SessionProvider';
import { useOffline } from '../../src/db/Provider';
import { authErrorKey, logoutWarning } from '../../src/auth/helpers';
import { Field } from '../../src/programs/components';
import { OptionCard } from '../../src/components/OptionCard';
export default function ProfileScreen() {
  const { t } = useTranslation(['common', 'navigation', 'auth']);
  const { saveError } = usePreferences(),
    account = useAccount(),
    session = useAuthSession(),
    { runtime } = useOffline();
  const [name, setName] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<ReturnType<typeof authErrorKey> | null>(null),
    [saved, setSaved] = useState(false),
    [warning, setWarning] = useState<'activeWarning' | 'pendingWarning' | null>(
      null,
    );
  const run = async (action: () => Promise<void>, showSaved = true) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await action();
      setSaved(showSaved);
    } catch (e) {
      setError(authErrorKey(e));
    } finally {
      setBusy(false);
    }
  };
  const profile = account.profile;
  return (
    <Screen
      bottomInset={false}
      keyboardAware
      dismissKeyboardLabel={t('auth:keyboardDone')}
    >
      <ScreenHeader
        title={t('navigation:profile')}
        subtitle={t('profile.description')}
        light
      />
      {profile ? (
        <Card style={{ padding: spacing.lg, gap: spacing.md }}>
          <Text variant="h3">{t('auth:account')}</Text>
          {session.email ? (
            <Text color={colors.secondary}>{session.email}</Text>
          ) : null}
          <Field
            label={t('auth:name')}
            value={name ?? profile.displayName ?? ''}
            onChangeText={setName}
            editable={!busy}
            maxLength={120}
            autoComplete="name"
          />
          <Button
            variant="secondary"
            label={t('auth:save')}
            busy={busy}
            disabled={
              !(name ?? '').trim() ||
              name === profile.displayName ||
              !runtime.online
            }
            onPress={() =>
              void run(async () => {
                await account.update({ displayName: name!.trim() });
                setName(null);
              })
            }
          />
        </Card>
      ) : null}
      <Card style={{ padding: spacing.lg, gap: spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Languages
            color={colors.secondary}
            size={sizes.icon}
            accessibilityElementsHidden
            importantForAccessibility="no"
          />
          <Text variant="h3">{t('language')}</Text>
        </View>
        <Text variant="caption" color={colors.secondary}>
          {t('profile.languageHelp')}
        </Text>
        <LanguagePicker
          compact
          disabled={busy}
          {...(profile
            ? {
                onChange: async (locale) =>
                  run(() => account.update({ locale })),
              }
            : {})}
        />
      </Card>
      {profile ? (
        <View style={{ gap: spacing.sm }}>
          <Text variant="h3">{t('auth:units')}</Text>
          <View style={{ gap: spacing.sm }}>
            {(['metric', 'imperial'] as const).map((unit) => (
              <OptionCard
                key={unit}
                compact
                label={t(`auth:${unit}`)}
                selected={profile.unitSystem === unit}
                disabled={busy || !runtime.online}
                onPress={() =>
                  void run(() => account.update({ unitSystem: unit }))
                }
              />
            ))}
          </View>
          <Text variant="caption" color={colors.secondary}>
            {t('auth:unitsHelp')}
          </Text>
        </View>
      ) : null}
      {profile && !runtime.online ? (
        <Text color={colors.secondary}>{t('auth:offlineProfile')}</Text>
      ) : null}
      {saved ? <Text accessibilityRole="alert">{t('auth:saved')}</Text> : null}
      {saveError || error ? (
        <Text color={colors.danger} accessibilityRole="alert">
          {error ? t(`auth:${error}`) : t('saveError')}
        </Text>
      ) : null}
      <Button
        variant="secondary"
        label={t('auth:logout')}
        disabled={busy}
        onPress={() =>
          void run(async () => {
            const owner = runtime.owner;
            const active = owner ? await runtime.workouts.active(owner) : null,
              pending = owner ? (await runtime.outbox.list(owner)).length : 0;
            const message = logoutWarning(!!active, pending);
            if (message) setWarning(message);
            else await account.logout();
          }, false)
        }
      />
      <Modal
        visible={!!warning}
        transparent
        animationType="none"
        onRequestClose={() => setWarning(null)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            padding: spacing.xl,
            backgroundColor: colors.background,
          }}
        >
          <Card accessibilityViewIsModal>
            <Text accessibilityRole="alert">
              {warning ? t(`auth:${warning}`) : ''}
            </Text>
            <Button
              label={t('auth:cancel')}
              disabled={busy}
              onPress={() => setWarning(null)}
            />
            <Button
              label={t('auth:logoutAnyway')}
              variant="secondary"
              busy={busy}
              onPress={() =>
                void run(async () => {
                  await account.logout();
                  setWarning(null);
                }, false)
              }
            />
          </Card>
        </View>
      </Modal>
    </Screen>
  );
}
