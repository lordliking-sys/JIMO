import { useRouter } from 'expo-router';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import FileInput from 'lucide-react-native/icons/file-input';
import PenLine from 'lucide-react-native/icons/pen-line';
import Sparkles from 'lucide-react-native/icons/sparkles';
import { useTranslation } from 'react-i18next';
import { startMethods } from '@jimo/schemas';
import { Button, Card, colors, IconButton, Screen, Text } from '@jimo/ui';
export default function CreateProgramScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const icons = { ai: Sparkles, import: FileInput, manual: PenLine };
  return (
    <Screen>
      <IconButton
        label={t('back')}
        icon={<ArrowLeft color={colors.text} />}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace('/')
        }
      />
      <Text variant="h1" accessibilityRole="header">
        {t('program.createTitle')}
      </Text>
      <Text color={colors.secondary}>{t('program.createDescription')}</Text>
      {startMethods.map((method) => {
        const Icon = icons[method];
        return (
          <Card key={method}>
            <Icon color={colors.primary} size={28} />
            <Text variant="h3">{t(`methods.${method}`)}</Text>
            <Text color={colors.secondary}>
              {t(`methodDescriptions.${method}`)}
            </Text>
            {method === 'manual' ? (
              <Button
                label={t('methods.manual')}
                onPress={() => router.push('/program/manual')}
              />
            ) : (
              <Text variant="label" color={colors.primarySoft}>
                {t('comingSoon')}
              </Text>
            )}
          </Card>
        );
      })}
    </Screen>
  );
}
