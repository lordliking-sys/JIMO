import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, View } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@jimo/ui';
import { useApiLocale } from '../api/queries';
import { useOffline } from '../db/Provider';
import { programsApi } from '../api/programs';
import { ProgramButton, programInk } from './presentation';
import { ErrorNotice } from './components';
export function DeleteProgram({
  id,
  onDeleted,
}: {
  id: string;
  onDeleted?: () => void;
}) {
  const { t } = useTranslation('programs'),
    locale = useApiLocale(),
    router = useRouter(),
    cache = useQueryClient(),
    { runtime } = useOffline();
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: async () => {
      await runtime.prepareProgramDelete(id);
      return programsApi.remove(id, locale);
    },
    onSuccess: async () => {
      await runtime.programs.remove(runtime.identity(), id);
      runtime.changed();
      cache.removeQueries({ queryKey: ['program', runtime.owner, id] });
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['programs'] }),
        cache.invalidateQueries({ queryKey: ['local'] }),
      ]);
      void runtime.engine.request(true);
      setOpen(false);
      if (onDeleted) onDeleted();
      else router.dismissTo('/program');
    },
  });
  return (
    <>
      <ProgramButton
        variant="text"
        label={t('deleteProgram')}
        onPress={() => setOpen(true)}
        style={{ borderWidth: 1, borderColor: programInk.danger }}
      />
      {open ? (
        <Modal
          transparent
          animationType="none"
          onRequestClose={() => {
            if (!mutation.isPending) setOpen(false);
          }}
        >
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              padding: 20,
              backgroundColor: 'rgba(0,0,0,0.7)',
            }}
          >
            <View
              accessibilityViewIsModal
              style={{
                padding: 20,
                gap: 16,
                borderRadius: 20,
                backgroundColor: programInk.background,
              }}
            >
              <Text variant="h3" color={programInk.text}>
                {t('confirmDeleteProgram')}
              </Text>
              <Text color={programInk.secondary}>
                {t('deleteProgramExplanation')}
              </Text>
              {mutation.error ? <ErrorNotice error={mutation.error} /> : null}
              <ProgramButton
                variant="outline"
                label={t('cancel')}
                disabled={mutation.isPending}
                onPress={() => setOpen(false)}
              />
              <ProgramButton
                label={t('deleteProgram')}
                busy={mutation.isPending}
                style={{ backgroundColor: programInk.danger }}
                onPress={() => {
                  if (!mutation.isPending) mutation.mutate();
                }}
              />
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}
