// @ts-expect-error browser-only fixture uses the installed ReactDOM runtime
import { createRoot } from 'react-dom/client';
import { View } from 'react-native';
import { ExerciseThumbnail } from '../src/programs/ExerciseThumbnail';
const pull = { canonicalName: 'Pull-Up', isCustom: false };
createRoot(document.getElementById('root')!).render(
  <View style={{ flexDirection: 'row', gap: 16, padding: 20 }}>
    <ExerciseThumbnail
      exercise={pull}
      tone="light"
      variant="female"
      size={96}
    />
    <ExerciseThumbnail exercise={pull} tone="dark" variant="male" size={96} />
    <ExerciseThumbnail
      exercise={{ canonicalName: 'Push-Up', isCustom: false }}
      tone="light"
      variant="female"
      size={96}
    />
  </View>,
);
