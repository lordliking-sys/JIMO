import { Redirect, useLocalSearchParams } from 'expo-router';
export default function LegacySettings() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={{ pathname: '/program/[id]', params: { id } }} />;
}
