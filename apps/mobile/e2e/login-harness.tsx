// @ts-expect-error test harness uses the installed browser runtime
import { createRoot } from 'react-dom/client';
import { I18nextProvider } from 'react-i18next';
import { i18n } from '../src/i18n';
import { AuthForm } from '../src/auth/AuthForm';
import { loginFixture, loginActions } from './login-mocks';
const q = new URLSearchParams(location.search);
void i18n.changeLanguage(q.get('locale') === 'en' ? 'en' : 'it');
Object.assign(window, { loginFixture, loginActions });
const fonts = {
  Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
  Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
  Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
  Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
};
void Promise.all(
  Object.entries(fonts).map(async ([name, source]) => {
    const face = await new FontFace(name, `url(${source})`).load();
    (document.fonts as unknown as { add(font: FontFace): void }).add(face);
  }),
).then(() =>
  createRoot(document.getElementById('root')!).render(
    <I18nextProvider i18n={i18n}>
      <AuthForm
        mode={
          q.has('signup')
            ? 'sign-up'
            : q.has('forgot')
              ? 'forgot-password'
              : 'sign-in'
        }
      />
    </I18nextProvider>,
  ),
);
