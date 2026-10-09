import { useState } from 'react';
import { Modal, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import UserRound from 'lucide-react-native/icons/user-round';
import Languages from 'lucide-react-native/icons/languages';
import Ruler from 'lucide-react-native/icons/ruler';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Info from 'lucide-react-native/icons/info';
import LogOut from 'lucide-react-native/icons/log-out';
import { progressSummarySchema } from '@jimo/schemas';
import { usePreferences } from '../storage/PreferencesProvider';
import { useAccount } from '../auth/AccountProvider';
import { useAuthSession } from '../auth/SessionProvider';
import { useOffline } from '../db/Provider';
import { authErrorKey, logoutWarning } from '../auth/helpers';
import { useProgressQuery, progressParams } from '../progress/queries';
import { EditorialScreen, Copy, PaperCard } from './Surface';
import { ProfileHero } from './Heroes';
import { ProfileStats } from './ProfileStats';
import { ProfileChoice, ProfileMenu, ProfileMenuRow } from './ProfileMenu';
import { Action, CacheNote, DataNotice } from './Controls';
import { ink } from './theme';

type Panel = 'account' | 'language' | 'units' | 'privacy' | 'about';
export default function ProfileScreen() {
  const { t } = useTranslation(['progressProfile', 'common', 'auth']);
  const { preferences, changeLocale, saving, saveError } = usePreferences(),
    account = useAccount(),
    session = useAuthSession(),
    { runtime } = useOffline();
  const [panel, setPanel] = useState<Panel | null>(null),
    [name, setName] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<ReturnType<typeof authErrorKey> | null>(null),
    [saved, setSaved] = useState(false),
    [warning, setWarning] = useState<'activeWarning' | 'pendingWarning' | null>(
      null,
    );
  const summary = useProgressQuery(
    '/progress/summary',
    progressSummarySchema,
    progressParams('8w'),
  );
  const profile = account.profile;
  const toggle = (next: Panel) =>
    setPanel((current) => (current === next ? null : next));
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
  const logout = () =>
    void run(async () => {
      const owner = runtime.owner,
        active = owner ? await runtime.workouts.active(owner) : null,
        pending = owner ? (await runtime.outbox.list(owner)).length : 0;
      const message = logoutWarning(!!active, pending);
      if (message) setWarning(message);
      else await account.logout();
    }, false);
  return (
    <EditorialScreen profile>
      <ProfileHero name={profile?.displayName ?? null} />
      <ProfileStats summary={summary.data?.payload} />
      <CacheNote
        stale={summary.data?.stale ?? false}
        {...(summary.data ? { fetchedAt: summary.data.fetchedAt } : {})}
      />
      {summary.error && !summary.data ? <Copy>{t('noData')}</Copy> : null}
      <ProfileMenu>
        <ProfileMenuRow
          icon={UserRound}
          title={t('auth:account')}
          subtitle={
            session.email ?? profile?.displayName ?? t('identityFallback')
          }
          disabled={!profile || busy}
          expanded={panel === 'account'}
          onPress={() => toggle('account')}
        >
          {profile ? (
            <>
              {session.email ? <Copy>{session.email}</Copy> : null}
              <Copy>{t('auth:name')}</Copy>
              <TextInput
                accessibilityLabel={t('auth:name')}
                value={name ?? profile.displayName ?? ''}
                onChangeText={setName}
                editable={!busy}
                maxLength={120}
                autoComplete="name"
                style={{
                  minHeight: 48,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderWidth: 1,
                  borderColor: ink.border,
                  color: ink.charcoal,
                  borderRadius: 7,
                  fontSize: 16,
                  fontFamily: 'Inter_400Regular',
                }}
              />
              <Action
                label={t('auth:save')}
                disabled={
                  busy ||
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
            </>
          ) : null}
        </ProfileMenuRow>
        <ProfileMenuRow
          icon={Languages}
          title={t('common:language')}
          subtitle={t(
            `common:languages.${preferences?.localePreference ?? 'system'}`,
          )}
          disabled={busy || saving}
          expanded={panel === 'language'}
          onPress={() => toggle('language')}
        >
          <Copy>{t('common:profile.languageHelp')}</Copy>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('common:language')}
            style={{ gap: 6 }}
          >
            {(['system', 'it', 'en'] as const).map((locale) => (
              <ProfileChoice
                key={locale}
                label={t(`common:languages.${locale}`)}
                selected={preferences?.localePreference === locale}
                disabled={busy || saving}
                onPress={() => {
                  if (profile) void run(() => account.update({ locale }));
                  else void changeLocale(locale);
                }}
              />
            ))}
          </View>
        </ProfileMenuRow>
        <ProfileMenuRow
          icon={Ruler}
          title={t('auth:units')}
          subtitle={profile ? t(`auth:${profile.unitSystem}`) : t('noData')}
          disabled={!profile || busy}
          expanded={panel === 'units'}
          onPress={() => toggle('units')}
        >
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel={t('auth:units')}
            style={{ gap: 6 }}
          >
            {(['metric', 'imperial'] as const).map((unit) => (
              <ProfileChoice
                key={unit}
                label={t(`auth:${unit}`)}
                selected={profile?.unitSystem === unit}
                disabled={busy || !runtime.online}
                onPress={() =>
                  void run(() => account.update({ unitSystem: unit }))
                }
              />
            ))}
          </View>
          <Copy>{t('auth:unitsHelp')}</Copy>
        </ProfileMenuRow>
        <ProfileMenuRow
          icon={ShieldCheck}
          title={t('privacyTitle')}
          subtitle={t('privacySubtitle')}
          expanded={panel === 'privacy'}
          onPress={() => toggle('privacy')}
        >
          <Copy>{t('privacyBody')}</Copy>
          <Copy>{t('privacyScope')}</Copy>
        </ProfileMenuRow>
        <ProfileMenuRow
          icon={Info}
          title={t('aboutTitle')}
          subtitle={t('aboutSubtitle')}
          expanded={panel === 'about'}
          onPress={() => toggle('about')}
        >
          <Copy>
            {t('version', { version: Constants.expoConfig?.version ?? '—' })}
          </Copy>
          <Copy>{t('aboutBody')}</Copy>
          <Copy>{t('fontLicense')}</Copy>
        </ProfileMenuRow>
        <ProfileMenuRow
          icon={LogOut}
          title={t('auth:logout')}
          subtitle={t('logoutSubtitle')}
          disabled={busy}
          onPress={logout}
        />
      </ProfileMenu>
      {account.error ? <DataNotice retry={account.retry} /> : null}
      {profile && !runtime.online ? (
        <Copy>{t('auth:offlineProfile')}</Copy>
      ) : null}
      {saved ? (
        <Copy accessibilityRole="alert" style={{ color: ink.green }}>
          {t('auth:saved')}
        </Copy>
      ) : null}
      {saveError || error ? (
        <Copy style={{ color: ink.danger }} accessibilityRole="alert">
          {error ? t(`auth:${error}`) : t('common:saveError')}
        </Copy>
      ) : null}
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
            padding: 24,
            backgroundColor: 'rgba(8, 13, 9, .85)',
          }}
        >
          <PaperCard accessibilityViewIsModal style={{ gap: 12 }}>
            <Copy accessibilityRole="alert" style={{ fontSize: 14 }}>
              {warning ? t(`auth:${warning}`) : ''}
            </Copy>
            <Action
              label={t('auth:cancel')}
              disabled={busy}
              onPress={() => setWarning(null)}
            />
            <Action
              label={t('auth:logoutAnyway')}
              disabled={busy}
              onPress={() =>
                void run(async () => {
                  await account.logout();
                  setWarning(null);
                }, false)
              }
            />
          </PaperCard>
        </View>
      </Modal>
    </EditorialScreen>
  );
}
