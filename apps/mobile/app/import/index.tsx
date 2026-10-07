import { useEffect, useRef, useState } from 'react';
import { Image, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { randomUUID } from 'expo-crypto';
import { Button, Screen, Text, colors, spacing } from '@jimo/ui';
import { importReviewSchema, importLimits } from '@jimo/schemas';
import { Back } from '../../src/programs/components';
import { useOffline } from '../../src/db/Provider';
import { apiRequest } from '../../src/api/client';
import { useImportDraft } from '../../src/imports/Provider';
import { reviewToDraft } from '../../src/imports/draft';
import {
  pickImages,
  pickPdf,
  cleanupSources,
  uploadBody,
  type SourceFile,
} from '../../src/imports/files';
import { importErrorKey, type ImportErrorKey } from '../../src/imports/errors';
export default function ImportSource() {
  const { t, i18n } = useTranslation('imports'),
    router = useRouter(),
    { runtime } = useOffline(),
    review = useImportDraft();
  const [files, setFiles] = useState<SourceFile[]>([]),
    [approved, setApproved] = useState(true),
    [phase, setPhase] = useState<
      'uploading' | 'analyzing' | 'preparing' | null
    >(null),
    [picking, setPicking] = useState(false),
    [error, setError] = useState<ImportErrorKey | null>(null);
  const sources = useRef<SourceFile[]>([]),
    controller = useRef<AbortController | null>(null),
    live = useRef(true),
    lock = useRef(false);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      controller.current?.abort();
      cleanupSources(sources.current);
    };
  }, []);
  const replace = (next: SourceFile[]) => {
    cleanupSources(sources.current);
    sources.current = next;
    setFiles(next);
  };
  const choose = async (kind: 'camera' | 'gallery' | 'pdf') => {
    if (lock.current) return;
    lock.current = true;
    setPicking(true);
    setError(null);
    try {
      const result =
        kind === 'pdf' ? await pickPdf() : await pickImages(kind === 'camera');
      if (!result.length) return;
      if (!live.current) {
        cleanupSources(result);
        return;
      }
      replace(result);
      setApproved(kind !== 'camera');
    } catch (e) {
      if (live.current) setError(importErrorKey(e));
    } finally {
      lock.current = false;
      if (live.current) setPicking(false);
    }
  };
  const analyze = async () => {
    if (lock.current || !runtime.online || !runtime.owner) return;
    lock.current = true;
    const owner = runtime.owner;
    setError(null);
    setPhase('uploading');
    controller.current = new AbortController();
    try {
      const locale = i18n.resolvedLanguage === 'it' ? 'it' : 'en',
        body = await uploadBody(files, locale);
      if (!live.current) return;
      setPhase('analyzing');
      const response = await apiRequest(
        '/imports/workout-plan',
        importReviewSchema,
        {
          method: 'POST',
          body,
          locale,
          expectedUserId: owner,
          timeoutMs: importLimits.timeoutMs,
          signal: controller.current.signal,
        },
      );
      if (!live.current || runtime.owner !== owner) return;
      setPhase('preparing');
      await review.update(() => reviewToDraft(response, randomUUID));
      cleanupSources(sources.current);
      sources.current = [];
      if (live.current) setFiles([]);
      if (live.current && runtime.owner === owner)
        router.push('/import/review');
    } catch (e) {
      if (live.current) setError(importErrorKey(e));
    } finally {
      lock.current = false;
      if (live.current) setPhase(null);
    }
  };
  const busy = phase !== null || picking;
  return (
    <Screen
      contentStyle={{ padding: spacing.lg, gap: spacing.lg }}
      footer={
        !phase && !review.draft && files.length && approved ? (
          <Button
            label={t('analyze')}
            onPress={() => void analyze()}
            disabled={
              busy || !runtime.online || !runtime.owner || !review.loaded
            }
          />
        ) : undefined
      }
    >
      <Back />
      <Text variant="h1" accessibilityRole="header">
        {t('title')}
      </Text>
      <Text color={colors.secondary}>{t('intro')}</Text>
      <Text variant="caption" color={colors.secondary}>
        {t('privacy')}
      </Text>
      {!phase ? (
        <Button
          label={t('manual')}
          variant="text"
          onPress={() => router.push('/program/manual')}
        />
      ) : null}
      {!runtime.online ? (
        <Text accessibilityRole="alert">{t('offline')}</Text>
      ) : null}
      {error || review.error ? (
        <Text color={colors.danger} accessibilityRole="alert">
          {t(error ?? 'errors.storage')}
        </Text>
      ) : null}
      {phase ? (
        <View style={{ gap: spacing.md }}>
          <Text variant="h2" accessibilityLiveRegion="polite">
            {t(`phases.${phase}`)}
          </Text>
          <Text color={colors.secondary}>{t('wait')}</Text>
          <Button
            label={t('leave')}
            variant="text"
            onPress={() => {
              controller.current?.abort();
              router.back();
            }}
          />
        </View>
      ) : (
        <>
          {review.draft ? (
            <View
              style={{
                gap: spacing.sm,
                borderBottomWidth: 1,
                borderColor: colors.border,
                paddingBottom: spacing.lg,
              }}
            >
              <Text variant="h3">{t('unfinished')}</Text>
              <Button
                label={t('resume')}
                variant="text"
                onPress={() => router.push('/import/review')}
              />
              <Button
                label={t('discard')}
                variant="text"
                onPress={() =>
                  void review.discard().catch(() => setError('errors.storage'))
                }
              />
            </View>
          ) : null}
          {!review.draft ? (
            <>
              <Button
                label={t('camera')}
                variant="secondary"
                disabled={busy}
                onPress={() => void choose('camera')}
              />
              <Button
                label={t('gallery')}
                variant="text"
                disabled={busy}
                onPress={() => void choose('gallery')}
              />
              <Button
                label={t('pdf')}
                variant="text"
                disabled={busy}
                onPress={() => void choose('pdf')}
              />
            </>
          ) : (
            <Text color={colors.secondary}>{t('discardBeforeNew')}</Text>
          )}
          <Text variant="caption" color={colors.secondary}>
            {t('limits')}
          </Text>
          {files.map((file, index) => (
            <View key={file.uri} style={{ gap: spacing.sm }}>
              <Text variant="label">{t('page', { number: index + 1 })}</Text>
              {file.mime.startsWith('image/') ? (
                <Image
                  source={{ uri: file.uri }}
                  style={{ height: 240, width: '100%', resizeMode: 'contain' }}
                  accessibilityLabel={t('preview', { number: index + 1 })}
                />
              ) : (
                <Text>{file.name}</Text>
              )}
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: spacing.sm,
                }}
              >
                <Button
                  variant="text"
                  label={t('remove')}
                  disabled={busy}
                  onPress={() => {
                    cleanupSources([file]);
                    const next = sources.current.filter((f) => f !== file);
                    sources.current = next;
                    setFiles(next);
                  }}
                />
                {index > 0 ? (
                  <Button
                    variant="text"
                    label={t('moveUp')}
                    disabled={busy}
                    onPress={() => {
                      const next = [...sources.current];
                      [next[index - 1], next[index]] = [
                        next[index]!,
                        next[index - 1]!,
                      ];
                      sources.current = next;
                      setFiles(next);
                    }}
                  />
                ) : null}
              </View>
            </View>
          ))}
          {!approved && files.length ? (
            <>
              <Button label={t('usePhoto')} onPress={() => setApproved(true)} />
              <Button
                label={t('retake')}
                variant="text"
                onPress={() => void choose('camera')}
              />
            </>
          ) : null}
        </>
      )}
    </Screen>
  );
}
