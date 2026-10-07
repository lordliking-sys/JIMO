import { useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Button, Screen, Text, spacing, colors } from '@jimo/ui';
import { Field } from '../programs/components';
import { Wordmark } from '../components/Wordmark';
import { useAuthSession } from './SessionProvider';
import { authErrorKey } from './helpers';
export function AuthForm({
  mode,
}: {
  mode: 'sign-in' | 'sign-up' | 'forgot-password';
}) {
  const auth = useAuthSession(),
    router = useRouter(),
    { t } = useTranslation('auth');
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState(''),
    [confirm, setConfirm] = useState(''),
    [code, setCode] = useState('');
  const [stage, setStage] = useState<'credentials' | 'verify' | 'reset'>(
      'credentials',
    ),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<
      ReturnType<typeof authErrorKey> | 'errors.confirm' | 'errors.wait' | null
    >(null),
    [sent, setSent] = useState(false);
  const lock = useRef(false),
    resendAt = useRef(0);
  const run = async (action: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError(null);
    setSent(false);
    try {
      await action();
    } catch (e) {
      setError(authErrorKey(e));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const submit = () =>
    void run(async () => {
      if (auth.needsAuth) {
        await auth.signOut();
        return;
      }
      if (stage === 'verify') {
        if (!/^\d{6}$/.test(code.trim())) {
          setError('errors.code');
          return;
        }
        if (mode === 'sign-up') await auth.verifyEmail(code.trim());
        else if (mode === 'sign-in') await auth.verifySignIn(code.trim());
        else {
          await auth.verifyReset(code.trim());
          setStage('reset');
        }
        return;
      }
      if (stage === 'reset') {
        if (!password || password !== confirm) {
          setError('errors.confirm');
          return;
        }
        await auth.resetPassword(password);
        return;
      }
      if (!z.email().safeParse(email.trim()).success) {
        setError('errors.email');
        return;
      }
      if (mode === 'forgot-password') {
        await auth.forgotPassword(email.trim());
        resendAt.current = Date.now();
        setStage('verify');
        return;
      }
      if (!password) {
        setError('errors.password');
        return;
      }
      if (mode === 'sign-up' && password !== confirm) {
        setError('errors.confirm');
        return;
      }
      const next =
        mode === 'sign-up'
          ? await auth.signUp({ email: email.trim(), password })
          : await auth.signIn({ email: email.trim(), password });
      if (next === 'verify') {
        resendAt.current = Date.now();
        setPassword('');
        setConfirm('');
        setStage('verify');
      }
    });
  const title =
    stage === 'verify'
      ? t(mode === 'forgot-password' ? 'resetCode' : 'verifyEmail')
      : stage === 'reset'
        ? t('newPassword')
        : t(
            mode === 'sign-in'
              ? 'signIn'
              : mode === 'sign-up'
                ? 'signUp'
                : 'forgotPassword',
          );
  const showPassword =
    (stage === 'credentials' && mode !== 'forgot-password') ||
    stage === 'reset';
  return (
    <Screen
      keyboardAware
      dismissKeyboardLabel={t('keyboardDone')}
      footer={
        <Button
          label={
            auth.needsAuth
              ? t('signInAgain')
              : stage === 'verify'
                ? t('verify')
                : stage === 'reset'
                  ? t('savePassword')
                  : title
          }
          busy={busy}
          disabled={!auth.loaded}
          onPress={submit}
        />
      }
      contentStyle={{ gap: spacing.xl }}
    >
      <View style={{ gap: spacing.sm, paddingTop: spacing.xl }}>
        <Wordmark compact />
        <Text color={colors.secondary}>{t('tagline')}</Text>
      </View>
      <Text variant="h1" accessibilityRole="header">
        {title}
      </Text>
      {auth.needsAuth ? (
        <Text accessibilityRole="alert">{t('errors.session')}</Text>
      ) : (
        <>
          {stage === 'credentials' ? (
            <Field
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              editable={!busy}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
            />
          ) : null}
          {stage === 'verify' ? (
            <>
              <Text color={colors.secondary}>{t('codeHelp')}</Text>
              <Field
                label={t('code')}
                value={code}
                onChangeText={setCode}
                editable={!busy}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
              />
              <Button
                label={t('resend')}
                disabled={busy}
                variant="secondary"
                onPress={() =>
                  void run(async () => {
                    if (Date.now() - resendAt.current < 30000) {
                      setError('errors.wait');
                      return;
                    }
                    if (mode === 'sign-up') await auth.resendEmail();
                    else if (mode === 'sign-in') await auth.resendSignIn();
                    else await auth.forgotPassword(email.trim());
                    resendAt.current = Date.now();
                    setSent(true);
                  })
                }
              />
              {sent ? <Text accessibilityRole="alert">{t('sent')}</Text> : null}
            </>
          ) : null}
          {showPassword ? (
            <View style={{ gap: spacing.sm }}>
              <Field
                label={t('password')}
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                secureTextEntry={!visible}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={
                  mode === 'sign-in' ? 'current-password' : 'new-password'
                }
                textContentType={
                  mode === 'sign-in' ? 'password' : 'newPassword'
                }
              />
              <Button
                variant="secondary"
                label={t(visible ? 'hidePassword' : 'showPassword')}
                onPress={() => setVisible((v) => !v)}
              />
              {mode === 'sign-up' || stage === 'reset' ? (
                <Field
                  label={t('confirmPassword')}
                  value={confirm}
                  onChangeText={setConfirm}
                  editable={!busy}
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="new-password"
                  textContentType="newPassword"
                />
              ) : null}
            </View>
          ) : null}
        </>
      )}
      {error ? (
        <Text color={colors.danger} accessibilityRole="alert">
          {t(error)}
        </Text>
      ) : null}
      {mode === 'sign-up' && stage === 'credentials' ? (
        <View nativeID="clerk-captcha" />
      ) : null}
      <View style={{ gap: spacing.sm }}>
        {mode === 'sign-in' ? (
          <>
            <Button
              variant="secondary"
              label={t('signUp')}
              disabled={busy}
              onPress={() => router.push('/auth/sign-up')}
            />
            <Button
              variant="secondary"
              label={t('forgotPassword')}
              disabled={busy}
              onPress={() => router.push('/auth/forgot-password')}
            />
          </>
        ) : (
          <Button
            variant="secondary"
            label={t('backSignIn')}
            disabled={busy}
            onPress={() => router.replace('/auth/sign-in')}
          />
        )}
      </View>
    </Screen>
  );
}
