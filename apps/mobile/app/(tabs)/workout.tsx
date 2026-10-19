import { Redirect } from 'expo-router';

/** Preserve old links without a second workout landing page. */
export default function WorkoutTab() {
  return <Redirect href="/" />;
}
