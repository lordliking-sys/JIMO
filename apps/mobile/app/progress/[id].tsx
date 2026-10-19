import { Redirect } from 'expo-router';

/** Exercise analytics live inline in Progress; old links return to that tab. */
export default function ExerciseProgressRedirect() {
  return <Redirect href="/progress" />;
}
