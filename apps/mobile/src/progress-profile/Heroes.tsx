import { SectionHeroFrame } from '../components/SectionHero';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EditorialText, Copy, useProfileMenuAnchor } from './Surface';
import { HeroTitle } from '../themes/anime-pink/HeroTitle';
import { animePink } from '@jimo/ui';
import Settings from 'lucide-react-native/icons/settings';
import { ProfileAvatar } from './ProfileAvatar';
export function ProgressHero() {
  const { t } = useTranslation('progressProfile');
  return (
    <SectionHeroFrame
      testID="progress-tab-hero"
      style={{ justifyContent: 'flex-start', paddingTop: 18 }}
    >
      <HeroTitle testID="progress-hero-title" accessibilityRole="header">
        {t('progressTitle').toUpperCase()}
      </HeroTitle>
    </SectionHeroFrame>
  );
}
export function ProfileHero() {
  const { t } = useTranslation('progressProfile');
  const { jumpToMenu } = useProfileMenuAnchor();
  return (
    <SectionHeroFrame
      testID="profile-tab-hero"
      style={{ justifyContent: 'flex-start', paddingTop: 18 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <HeroTitle accessibilityRole="header" style={{ flex: 1, fontSize: 28 }}>
          {t('profileTitle').toUpperCase()}
        </HeroTitle>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('settings')}
          onPress={jumpToMenu}
          style={{
            width: 48,
            height: 48,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Settings size={25} color={animePink.white} accessible={false} />
        </Pressable>
      </View>
    </SectionHeroFrame>
  );
}
export function ProfileIdentity({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const { t } = useTranslation('progressProfile');
  return (
    <View
      testID="profile-identity-card"
      style={{
        paddingVertical: 4,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
      }}
    >
      <View style={{ width: 84 }}>
        <ProfileAvatar name={name} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <EditorialText
          testID="profile-display-name"
          style={{ fontSize: 23, lineHeight: 29 }}
        >
          {name || t('identityFallback')}
        </EditorialText>
        {email ? <Copy style={{ fontSize: 13 }}>{email}</Copy> : null}
      </View>
    </View>
  );
}
