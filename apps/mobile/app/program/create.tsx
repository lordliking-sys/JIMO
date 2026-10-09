import { PendingReview } from '../../src/imports/PendingReview';
import { useImportFeature } from '../../src/features/useImportFeature';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Text } from '@jimo/ui';
import {
  ProgramScreen,
  ProgramButton,
  programInk,
} from '../../src/programs/presentation';
import { FormHeader } from '../../src/programs/components';
export default function CreateProgramScreen() {
  const importEnabled = useImportFeature(),
    { t } = useTranslation(),
    router = useRouter();
  return (
    <ProgramScreen>
      <FormHeader title={t('program.createTitle')} />
      <Text color={programInk.secondary}>{t('program.createDescription')}</Text>
      <PendingReview />
      <ProgramButton
        label={t('methods.manual')}
        onPress={() => router.push('/program/manual')}
      />
      <Text color={programInk.secondary}>
        {t('methods.ai')} · {t('comingSoon')}
      </Text>
      {importEnabled ? (
        <ProgramButton
          variant="outline"
          label={t('methods.import')}
          onPress={() => router.push('/import')}
        />
      ) : (
        <Text color={programInk.secondary}>
          {t('methods.import')} · {t('comingSoon')}
        </Text>
      )}
    </ProgramScreen>
  );
}
