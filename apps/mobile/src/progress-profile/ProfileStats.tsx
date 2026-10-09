import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ProgressSummary } from '@jimo/schemas';
import { formatNumber } from '../progress/helpers';
import { Copy, EditorialText, PaperCard } from './Surface';
import { ink } from './theme';

export function ProfileStats({
  summary,
}: {
  summary: ProgressSummary | undefined;
}) {
  const { t, i18n } = useTranslation('progressProfile');
  const metrics = [
    {
      label: t('statWorkouts'),
      value: summary
        ? formatNumber(summary.completedWorkouts, i18n.language, 0)
        : '—',
    },
    {
      label: t('statSets'),
      value: summary
        ? formatNumber(summary.completedSets, i18n.language, 0)
        : '—',
    },
    {
      label: t('statFrequency'),
      value: summary
        ? formatNumber(summary.sessionsPerWeek, i18n.language)
        : '—',
    },
  ];
  return (
    <PaperCard
      testID="profile-stats"
      style={{ paddingVertical: 12, paddingHorizontal: 6, gap: 4 }}
    >
      <View style={{ flexDirection: 'row' }}>
        {metrics.map((metric, index) => (
          <View
            key={metric.label}
            style={{
              flex: 1,
              minWidth: 0,
              alignItems: 'center',
              borderLeftWidth: index ? 1 : 0,
              borderColor: ink.border,
              paddingHorizontal: 3,
            }}
          >
            <EditorialText style={{ fontSize: 30, lineHeight: 34 }}>
              {metric.value}
            </EditorialText>
            <Copy
              style={{ color: ink.charcoal, fontSize: 11, textAlign: 'center' }}
            >
              {metric.label}
            </Copy>
          </View>
        ))}
      </View>
      <Copy style={{ fontSize: 10, textAlign: 'center' }}>
        {summary
          ? `${new Date(summary.period.from).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })} – ${new Date(summary.period.to).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}`
          : t('noData')}
      </Copy>
    </PaperCard>
  );
}
