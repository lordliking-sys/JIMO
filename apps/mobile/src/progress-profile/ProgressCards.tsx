import { View, useWindowDimensions } from 'react-native';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import Trophy from 'lucide-react-native/icons/trophy';
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
  const { fontScale } = useWindowDimensions();
  const sideBySide = !small && !!points && value.length <= 9;
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
        style={{
          fontSize: small ? 15 : 18,
          lineHeight: small ? 21 : 25,
          minHeight: small ? 42 * fontScale : undefined,
        }}
      >
        {label}
      </EditorialText>
      <View
        style={{
          flexDirection: sideBySide ? 'row' : 'column',
          alignItems: sideBySide ? 'flex-end' : 'stretch',
          gap: 12,
        }}
      >
        <View style={{ flex: sideBySide ? 1 : undefined, minWidth: 0, gap: 3 }}>
          <EditorialText
            testID={testID ? `${testID}-value` : undefined}
            style={{ fontSize: small ? 22 : 34, lineHeight: small ? 30 : 42 }}
          >
            {value}
          </EditorialText>
          {caption ? (
            <Copy style={{ fontSize: 11, lineHeight: 16 }}>{caption}</Copy>
          ) : null}
        </View>
        {points ? (
          <View style={{ width: sideBySide ? '53%' : '100%', minWidth: 0 }}>
            <ProgressChart
              title={label}
              points={points}
              bars={bars}
              small={small}
              {...(format ? { format } : {})}
            />
          </View>
        ) : null}
      </View>
    </PaperCard>
  );
}
export function PersonalRecordRow({
  record,
  latest,
}: {
  record: ProgressRecord;
  latest?: Performance;
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
    <View
      accessible
      accessibilityLabel={`${record.displayName}, ${t(`progress:recordTypes.${record.type}`)}, ${recordText(record, locale)}`}
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
        <EditorialText style={{ fontSize: 18 }}>
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
    </View>
  );
}
export function DataRow({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${subtitle}`}
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
        <EditorialText style={{ fontSize: 18 }}>{title}</EditorialText>
        <Copy>{subtitle}</Copy>
      </View>
    </View>
  );
}
