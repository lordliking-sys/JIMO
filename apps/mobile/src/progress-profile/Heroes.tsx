import { MainTabHero } from '../components/MainTabHero';
import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { EditorialText, Copy, useProfileMenuAnchor } from './Surface';
import Settings from 'lucide-react-native/icons/settings';
import { HeroReadabilityWash } from '../components/HeroReadabilityWash';
import { artwork, ink } from './theme';
import { ProfileAvatar } from './ProfileAvatar';

export function ProgressHero() {
  const { t } = useTranslation('progressProfile'),
    { width } = useWindowDimensions();
  return (
    <MainTabHero testID="progress-tab-hero">
      <View style={{ position: 'relative', paddingLeft: 8 }}>
        <HeroReadabilityWash testID="progress-readability-wash" />
        <EditorialText
          accessibilityRole="header"
          style={{ fontSize: width < 360 ? 32 : 36, lineHeight: 44 }}
        >
          {t('progressTitle')}
        </EditorialText>
        <Image
          source={artwork.brush}
          tintColor={ink.charcoal}
          accessible={false}
          resizeMode="contain"
          style={{ width: 126, height: 16, marginLeft: 8 }}
        />
      </View>
    </MainTabHero>
  );
}
export function ProfileHero({ name }: { name: string | null }) {
  const { t } = useTranslation('progressProfile'),
    { width } = useWindowDimensions();
  const { jumpToMenu } = useProfileMenuAnchor();
  return (
    <MainTabHero testID="profile-tab-hero">
      <HeroReadabilityWash variant="dark" testID="profile-readability-wash" />
      <EditorialText
        accessibilityRole="header"
        style={{
          color: ink.paper,
          fontSize: width < 360 ? 35 : 40,
          lineHeight: 48,
          paddingLeft: 8,
        }}
      >
        {t('profileTitle')}
      </EditorialText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('settings')}
        onPress={jumpToMenu}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 0,
          top: 22,
          width: 48,
          height: 48,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Settings size={25} color={ink.paper} accessible={false} />
      </Pressable>
      <Image
        source={artwork.brush}
        accessible={false}
        resizeMode="contain"
        tintColor={ink.paper}
        style={{ width: 126, height: 16, marginLeft: 16 }}
      />
      <View style={{ alignItems: 'center', marginTop: 10, gap: 2 }}>
        <ProfileAvatar name={name} />
        <EditorialText
          testID="profile-display-name"
          style={{
            color: ink.paper,
            fontSize: 30,
            lineHeight: 34,
            textAlign: 'center',
          }}
        >
          {name || t('identityFallback')}
        </EditorialText>
        <Copy style={{ color: ink.paper, textAlign: 'center', fontSize: 12 }}>
          {t('motto')}
        </Copy>
      </View>
    </MainTabHero>
  );
}
