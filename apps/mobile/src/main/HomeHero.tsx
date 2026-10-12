import { View } from 'react-native';
import { MainTabHero } from '../components/MainTabHero';

/** Artwork owns the branding; no copy or workout controls cover the subject. */
export function HomeHero() {
  return (
    <MainTabHero testID="home-hero">
      <View
        testID="home-brand"
        accessible
        accessibilityRole="header"
        accessibilityLabel="JIMO"
        style={{ width: 1, height: 1 }}
      />
    </MainTabHero>
  );
}
