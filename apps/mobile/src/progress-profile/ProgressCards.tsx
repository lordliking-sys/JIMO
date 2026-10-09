import { Pressable, View } from 'react-native';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Trophy from 'lucide-react-native/icons/trophy';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { useTranslation } from 'react-i18next';
import type { ProgressRecord, Performance } from '@jimo/schemas';
import { recordText, performanceText } from '../progress/helpers';
import { EditorialText, Copy, PaperCard } from './Surface';
import { ink } from './theme';
import { ProgressChart } from './ProgressChart';
import type { ChartPoint } from './chart';

export function StatCard({
  label,
  value,
  caption,
  points,
  bars = false,
  small = false,
  format,
  testID,
}: {
  label: string;
  value: string;
  caption?: string;
  points?: ChartPoint[];
  bars?: boolean;
  small?: boolean;
  format?: (value: number) => string;
  testID?: string;
}) {
  return (
    <PaperCard
      {...(testID ? { testID } : {})}
      style={{
        flex: small ? 1 : undefined,
        minWidth: 0,
        gap: 0,
        padding: small ? 12 : 14,
      }}
    >
      <EditorialText
        style={{ fontSize: small ? 19 : 21, lineHeight: small ? 22 : 24 }}
      >
        {label}
      </EditorialText>
      <EditorialText
        style={{ fontSize: small ? 28 : 34, lineHeight: small ? 32 : 36 }}
      >
        {value}
      </EditorialText>
      {caption ? (
        <Copy style={{ fontSize: 11, lineHeight: 16 }}>{caption}</Copy>
      ) : null}
      {points ? (
        <ProgressChart
          title={label}
          points={points}
          bars={bars}
          small={small}
          {...(format ? { format } : {})}
        />
      ) : null}
    </PaperCard>
  );
}
export function PersonalRecordRow({
  record,
  latest,
  onPress,
}: {
  record: ProgressRecord;
  latest?: Performance;
  onPress: () => void;
}) {
  const { t, i18n } = useTranslation(['progressProfile', 'progress']),
    locale = i18n.language;
  const current =
    latest &&
    latest.trackingMode === record.trackingMode &&
    latest.loadMode === record.loadMode
      ? performanceText(latest, locale)
      : '—';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${record.displayName}, ${t(`progress:recordTypes.${record.type}`)}, ${recordText(record, locale)}`}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        minHeight: 96,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderColor: ink.border,
      }}
    >
      <Dumbbell size={32} color={ink.green} accessible={false} />
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <EditorialText style={{ fontSize: 23 }}>
          {record.displayName}
        </EditorialText>
        <EditorialText style={{ fontSize: 21, color: ink.green }}>
          {recordText(record, locale)}
        </EditorialText>
        <Copy>{t('current', { value: current })}</Copy>
        <Copy style={{ fontSize: 10 }}>
          {t(`progress:recordTypes.${record.type}`)} ·{' '}
          {new Date(record.date).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Copy>
      </View>
      <Trophy color={ink.green} size={23} accessible={false} />
    </Pressable>
  );
}
export function DataRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        minHeight: 60,
        borderTopWidth: 1,
        borderColor: ink.border,
      }}
    >
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <EditorialText style={{ fontSize: 22 }}>{title}</EditorialText>
        <Copy>{subtitle}</Copy>
      </View>
      <ChevronRight size={20} color={ink.green} accessible={false} />
    </Pressable>
  );
}
