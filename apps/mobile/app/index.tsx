import { StyleSheet, Text, View } from 'react-native';
import { APP_NAME } from '@jimo/ui';
export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{APP_NAME}</Text>
      <Text style={styles.subtitle}>Train. Track. Progress.</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  title: { fontSize: 40, fontWeight: '700', color: '#111' },
  subtitle: { marginTop: 12, fontSize: 18, color: '#444' },
});
