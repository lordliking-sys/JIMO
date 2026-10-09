import { Image, Pressable, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  EditorialText,
  Copy,
  useProfileHeroSize,
  useProfileMenuAnchor,
} from './Surface';
import Settings from 'lucide-react-native/icons/settings';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { artwork, ink } from './theme';
import { monogram } from './chart';

export function ProgressHero() {
  const { t } = useTranslation('progressProfile'),
    { width } = useWindowDimensions();
  return (
    <View style={{ paddingTop: 22, paddingLeft: 8, paddingBottom: 24 }}>
      <Svg
        pointerEvents="none"
        accessible={false}
        width={240}
        height={90}
        style={{ position: 'absolute', left: 0, top: 18 }}
      >
        <Defs>
          <RadialGradient id="progress-title-paper" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={ink.paper} stopOpacity={0.95} />
            <Stop offset=".6" stopColor={ink.paper} stopOpacity={0.82} />
            <Stop offset="1" stopColor={ink.paper} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={120}
          cy={45}
          rx={120}
          ry={45}
          fill="url(#progress-title-paper)"
        />
      </Svg>
      <EditorialText
        accessibilityRole="header"
        style={{ fontSize: width < 360 ? 35 : 40, lineHeight: 48 }}
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
  );
}
export function ProfileHero({ name }: { name: string | null }) {
  const { t } = useTranslation('progressProfile'),
    { width } = useWindowDimensions();
  const initial = monogram(name);
  const reportSize = useProfileHeroSize();
  const { jumpToMenu } = useProfileMenuAnchor();
  return (
    <View
      onLayout={(event) => reportSize(event.nativeEvent.layout.height)}
      style={{
        minHeight: Math.min(width, 560) * 0.7,
        paddingTop: 22,
        paddingBottom: 18,
      }}
    >
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
        <View
          accessible
          accessibilityRole="image"
          accessibilityLabel={`${t('avatar')}: ${initial}`}
          style={{
            width: 84,
            height: 84,
            borderRadius: 42,
            borderWidth: 2,
            borderColor: ink.paper,
            backgroundColor: 'rgba(12, 20, 14, .65)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          <EditorialText style={{ color: ink.paper, fontSize: 42 }}>
            {initial}
          </EditorialText>
        </View>
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
    </View>
  );
}
