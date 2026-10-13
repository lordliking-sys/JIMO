import { Image, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSectionHeroGeometry } from '../components/SectionHero';
import { animePinkAssets } from '../themes/anime-pink/assets';
import { profileArtworkLayout } from '../themes/anime-pink/artwork-geometry';
export function useProfileStage() {
  const { width } = useWindowDimensions(),
    insets = useSafeAreaInsets(),
    geometry = useSectionHeroGeometry();
  return {
    ...profileArtworkLayout(width, geometry.height + insets.top, insets.top),
    width,
    insets,
    padding: width < 360 ? 16 : 22,
    frameWidth: Math.min(width, 560),
    origin: Math.max(0, (width - 560) / 2),
  };
}
/** Only the transparent foreground crosses the seam; the hero background stays behind the body. */
export function ProfileCharacter() {
  const stage = useProfileStage(),
    source = animePinkAssets['profile.character'];
  if (!source) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        width: stage.character.width,
        height: stage.character.height,
        left: stage.character.left - stage.origin,
        top: stage.character.top,
        zIndex: 2,
      }}
    >
      <Image
        testID="profile-character-overlay"
        accessible={false}
        source={typeof source === 'string' ? { uri: source } : source}
        resizeMode="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}
