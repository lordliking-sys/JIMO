import { SectionHeroFrame } from '../components/SectionHero';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EditorialText, Copy } from './Surface';
import { HeroTitle } from '../themes/anime-pink/HeroTitle';
import { ProfileAvatar } from './ProfileAvatar';
import { useProfileStage } from './ProfileArtwork';

export function ProgressHero() {
  const { t } = useTranslation('progressProfile');
  return (
    <SectionHeroFrame
      testID="progress-tab-hero"
      style={{ justifyContent: 'flex-start', paddingTop: 14 }}
    >
      <HeroTitle testID="progress-hero-title" accessibilityRole="header">
        {t('progressTitle').toUpperCase()}
      </HeroTitle>
    </SectionHeroFrame>
  );
}
export function ProfileHero() {
  const { t } = useTranslation('progressProfile');
  return (
    <SectionHeroFrame
      testID="profile-tab-hero"
      style={{
        justifyContent: 'flex-start',
        paddingTop: 18,
        overflow: 'visible',
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <HeroTitle accessibilityRole="header" style={{ flex: 1, fontSize: 28 }}>
          {t('profileTitle').toUpperCase()}
        </HeroTitle>
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
  const stage = useProfileStage();
  // SectionBody starts 24 px above the hero's bottom and has 20 px of inner padding.
  const identityTop = stage.bodyTop + 20;
  const contentWidth =
    stage.frameWidth -
    stage.insets.left -
    stage.insets.right -
    stage.padding * 2;
  return (
    <View
      testID="profile-identity-card"
      style={{
        paddingTop: stage.infoTop - identityTop,
        alignItems: 'center',
        gap: 4,
      }}
    >
      <View
        testID="profile-avatar-dock"
        style={{
          position: 'absolute',
          top: stage.avatar.centerY - stage.avatar.size / 2 - identityTop,
          left:
            stage.avatar.centerX -
            stage.origin -
            stage.insets.left -
            stage.padding -
            contentWidth / 2,
          width: contentWidth,
          alignItems: 'center',
        }}
      >
        <ProfileAvatar name={name} />
      </View>
      <View
        style={{ width: '100%', minWidth: 0, gap: 4, alignItems: 'center' }}
      >
        <EditorialText
          testID="profile-display-name"
          style={{ fontSize: 23, lineHeight: 29, textAlign: 'center' }}
        >
          {name || t('identityFallback')}
        </EditorialText>
        {email ? (
          <Copy style={{ fontSize: 13, textAlign: 'center' }}>{email}</Copy>
        ) : null}
      </View>
    </View>
  );
}
