import { useState } from 'react';
import {
  Image,
  StyleSheet,
  View,
  type ImageSourcePropType,
} from 'react-native';
import Dumbbell from 'lucide-react-native/icons/dumbbell';
import type { ExerciseDto } from '@jimo/schemas';
import { animePink } from '@jimo/ui';
import { ink } from '../progress-profile/theme';
import {
  exerciseArtworkKey,
  type ExerciseArtworkKey,
  type ExerciseArtworkVariant,
} from './exercise-artwork';
import {
  exerciseArtSources,
  exerciseCardBackgrounds,
} from './exercise-artwork-sources';

/** Decorative only: the containing row owns the full exercise/accessibility label. */
export function ExerciseThumbnail({
  exercise,
  tone = 'light',
  variant = 'male',
  size = 56,
  cardBackground = true,
}: {
  exercise: Pick<ExerciseDto, 'canonicalName' | 'isCustom'>;
  tone?: 'light' | 'dark';
  variant?: ExerciseArtworkVariant;
  size?: number;
  cardBackground?: boolean;
}) {
  const key = exerciseArtworkKey(exercise);
  const sources: Partial<Record<ExerciseArtworkKey, ImageSourcePropType>> =
    exerciseArtSources[variant];
  const source = key ? sources[key] : undefined;
  const [failedSource, setFailedSource] = useState<ImageSourcePropType>();
  const failed = !!source && failedSource === source;
  const geometry = {
    width: Math.round((size * 4) / 3),
    height: size,
    image: { width: '100%' as const, height: '100%' as const },
  };
  return (
    <View
      testID="exercise-thumbnail"
      pointerEvents="none"
      accessible={false}
      style={{
        width: geometry.width,
        height: geometry.height,
        flexShrink: 0,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: cardBackground
          ? tone === 'dark'
            ? ink.charcoal
            : ink.paper
          : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {cardBackground ? (
        <Image
          testID={`exercise-card-${tone}`}
          source={exerciseCardBackgrounds[tone]}
          resizeMode="cover"
          accessible={false}
          style={[
            StyleSheet.absoluteFill,
            { width: '100%', height: '100%' },
            tone === 'light' && { tintColor: animePink.surfaceSoft },
          ]}
        />
      ) : null}
      {source && !failed ? (
        <Image
          testID={`exercise-art-${variant}-${key}`}
          source={source}
          onError={() => setFailedSource(source)}
          resizeMode="contain"
          resizeMethod="resize"
          accessible={false}
          style={{ ...geometry.image, zIndex: 1 }}
        />
      ) : (
        <View style={{ zIndex: 1 }}>
          <Dumbbell
            testID="exercise-art-fallback"
            size={24}
            color={tone === 'dark' ? ink.sage : ink.green}
            accessible={false}
          />
        </View>
      )}
    </View>
  );
}
