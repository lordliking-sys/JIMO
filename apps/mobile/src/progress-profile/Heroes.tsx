import { SectionHeroFrame } from '../components/SectionHero';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EditorialText, useProfileMenuAnchor } from './Surface';
import Settings from 'lucide-react-native/icons/settings';
import { ink } from './theme';
import { ProfileAvatar } from './ProfileAvatar';

export function ProgressHero() {
  const { t } = useTranslation('progressProfile');
  return (
    <SectionHeroFrame testID="progress-tab-hero">
      <EditorialText
        testID="progress-hero-title"
        accessibilityRole="header"
        style={{
          textAlign: 'center',
          fontSize: 30,
          letterSpacing: 2,
          marginBottom: 12,
        }}
      >
        {t('progressTitle')}
      </EditorialText>
    </SectionHeroFrame>
  );
}
export function ProfileHero({ name }: { name: string | null }) {
  const { t } = useTranslation('progressProfile'),
    { width } = useWindowDimensions();
  const { jumpToMenu } = useProfileMenuAnchor();
  return (
    <SectionHeroFrame testID="profile-tab-hero">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings')}
        onPress={jumpToMenu}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 0,
          top: 8,
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Settings size={25} color={ink.paper} accessible={false} />
      </Pressable>
      <View
        style={{
          alignSelf: 'flex-end',
          width: '56%',
          paddingTop: Math.min(130, width * 0.3),
        }}
      >
        <View style={{ alignItems: 'center', gap: 2 }}>
          <ProfileAvatar name={name} />
          <EditorialText
            testID="profile-display-name"
            style={{
              color: ink.paper,
              fontSize: 23,
              lineHeight: 26,
              textAlign: 'center',
            }}
          >
            {name || t('identityFallback')}
          </EditorialText>
        </View>
      </View>
    </SectionHeroFrame>
  );
}
